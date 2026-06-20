import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import type { AppConfig } from '../../config/configuration';

export type ModelTier = 'default' | 'structured' | 'cheap';

export interface GenerateOptions {
  tier?: ModelTier;
  system?: string;
  json?: boolean;
  schema?: unknown; // used by Gemini's responseSchema; ignored by Groq
  temperature?: number;
}

export interface AiResult {
  text: string;
  tokensUsed: number;
  model: string;
}

/** Provider abstraction — swap engines without touching feature code. */
export abstract class AiProvider {
  abstract generate(prompt: string, opts?: GenerateOptions): Promise<AiResult>;
}

// --- Google Gemini (free tier; geo-restricted) -----------------------------
@Injectable()
export class GeminiProvider extends AiProvider {
  private client?: GoogleGenAI;

  constructor(private readonly config: ConfigService<AppConfig, true>) {
    super();
  }

  private cfg() {
    return this.config.get('ai', { infer: true }).gemini;
  }

  private modelFor(tier: ModelTier): string {
    const g = this.cfg();
    if (tier === 'structured') return g.modelStructured;
    if (tier === 'cheap') return g.modelCheap;
    return g.modelDefault;
  }

  private get ai(): GoogleGenAI {
    const key = this.cfg().apiKey;
    if (!key) {
      throw new ServiceUnavailableException(
        'AI is not configured — set GEMINI_API_KEY.',
      );
    }
    if (!this.client) this.client = new GoogleGenAI({ apiKey: key });
    return this.client;
  }

  async generate(prompt: string, opts: GenerateOptions = {}): Promise<AiResult> {
    const model = this.modelFor(opts.tier ?? 'default');
    const config: Record<string, unknown> = {};
    if (opts.system) config.systemInstruction = opts.system;
    if (opts.temperature != null) config.temperature = opts.temperature;
    if (opts.json) {
      config.responseMimeType = 'application/json';
      if (opts.schema) config.responseSchema = opts.schema;
    }
    const res = await this.ai.models.generateContent({
      model,
      contents: prompt,
      config,
    });
    return {
      text: res.text ?? '',
      tokensUsed: res.usageMetadata?.totalTokenCount ?? 0,
      model,
    };
  }
}

// --- Groq (free; globally available; OpenAI-compatible) --------------------
@Injectable()
export class GroqProvider extends AiProvider {
  private readonly logger = new Logger(GroqProvider.name);
  private readonly endpoint = 'https://api.groq.com/openai/v1/chat/completions';

  constructor(private readonly config: ConfigService<AppConfig, true>) {
    super();
  }

  private cfg() {
    return this.config.get('ai', { infer: true }).groq;
  }

  private modelFor(tier: ModelTier): string {
    const g = this.cfg();
    if (tier === 'structured') return g.modelStructured;
    if (tier === 'cheap') return g.modelCheap;
    return g.modelDefault;
  }

  async generate(prompt: string, opts: GenerateOptions = {}): Promise<AiResult> {
    const key = this.cfg().apiKey;
    if (!key) {
      throw new ServiceUnavailableException(
        'AI is not configured — set GROQ_API_KEY (free at console.groq.com).',
      );
    }
    const model = this.modelFor(opts.tier ?? 'default');

    const body: Record<string, unknown> = {
      model,
      temperature: opts.temperature ?? 0.7,
      messages: [
        ...(opts.system ? [{ role: 'system', content: opts.system }] : []),
        { role: 'user', content: prompt },
      ],
    };
    // Groq supports JSON mode (not full JSON-schema) — the prompt describes shape.
    if (opts.json) body.response_format = { type: 'json_object' };

    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`Groq ${res.status}: ${text.slice(0, 300)}`);
      throw new ServiceUnavailableException(
        `AI request failed (${res.status}). ${text.slice(0, 160)}`,
      );
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { total_tokens?: number };
    };
    return {
      text: data.choices?.[0]?.message?.content ?? '',
      tokensUsed: data.usage?.total_tokens ?? 0,
      model,
    };
  }
}
