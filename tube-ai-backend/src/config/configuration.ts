/**
 * Typed configuration loader. Reads from validated `process.env` and exposes a
 * single, strongly-typed config tree consumed via ConfigService<AppConfig>.
 *
 * Keep this the ONLY place that touches `process.env` directly — everything else
 * reads through ConfigService so config is testable and centrally documented.
 */
export interface AppConfig {
  env: 'development' | 'test' | 'production';
  port: number;
  corsOrigins: string[];
  adminEmails: string[];
  mongoUri: string;
  redis: {
    url?: string; // full connection string wins if set (e.g. cloud Redis/Upstash)
    host: string;
    port: number;
    username?: string;
    password?: string;
    tls: boolean;
  };
  jwt: {
    secret: string;
    accessTtl: string;
    refreshTtl: string;
  };
  google: { clientId?: string; clientSecret?: string };
  /**
   * AI provider config. Provider-abstracted so we can swap engines without
   * touching feature code. `provider` selects which one is live.
   *   - groq:   free + globally available (works where Gemini's free tier isn't)
   *   - gemini: free tier, but geo-restricted (not available in some regions)
   */
  ai: {
    provider: 'groq' | 'gemini' | 'ollama';
    gemini: {
      apiKey?: string;
      modelDefault: string;
      modelStructured: string;
      modelCheap: string;
    };
    groq: {
      apiKey?: string;
      modelDefault: string;
      modelStructured: string;
      modelCheap: string;
    };
  };
  freeLimits: {
    videosPerDay: number;
    generationsPerDay: number;
    maxVideoDurationSec: number;
  };
  smtp: {
    host?: string;
    port: number;
    user?: string;
    pass?: string;
    from: string;
  };
}

const splitCsv = (value?: string): string[] =>
  (value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export default (): AppConfig => ({
  env: (process.env.NODE_ENV as AppConfig['env']) ?? 'development',
  port: parseInt(process.env.PORT ?? '3035', 10),
  corsOrigins: splitCsv(process.env.CORS_ORIGINS) || ['http://localhost:4200'],
  adminEmails: splitCsv(process.env.ADMIN_EMAILS).map((e) => e.toLowerCase()),
  mongoUri: process.env.MONGODB_URI as string,
  redis: {
    url: process.env.REDIS_URL || undefined,
    host: process.env.REDIS_HOST ?? '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    username: process.env.REDIS_USERNAME || undefined,
    password: process.env.REDIS_PASSWORD || undefined,
    tls: process.env.REDIS_TLS === 'true',
  },
  jwt: {
    secret: process.env.JWT_SECRET as string,
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '7d',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  },
  ai: {
    provider:
      (process.env.AI_PROVIDER as 'groq' | 'gemini' | 'ollama') ?? 'groq',
    gemini: {
      apiKey: process.env.GEMINI_API_KEY || undefined,
      modelDefault: process.env.AI_MODEL_DEFAULT ?? 'gemini-2.0-flash',
      modelStructured: process.env.AI_MODEL_STRUCTURED ?? 'gemini-2.0-flash',
      modelCheap: process.env.AI_MODEL_CHEAP ?? 'gemini-2.0-flash-lite',
    },
    groq: {
      apiKey: process.env.GROQ_API_KEY || undefined,
      modelDefault: process.env.GROQ_MODEL_DEFAULT ?? 'llama-3.3-70b-versatile',
      modelStructured:
        process.env.GROQ_MODEL_STRUCTURED ?? 'llama-3.3-70b-versatile',
      modelCheap: process.env.GROQ_MODEL_CHEAP ?? 'llama-3.1-8b-instant',
    },
  },
  freeLimits: {
    videosPerDay: parseInt(process.env.FREE_VIDEOS_PER_DAY ?? '3', 10),
    generationsPerDay: parseInt(process.env.FREE_GENERATIONS_PER_DAY ?? '15', 10),
    maxVideoDurationSec: parseInt(process.env.FREE_MAX_VIDEO_SEC ?? '1800', 10),
  },
  smtp: {
    host: process.env.SMTP_HOST || undefined,
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    user: process.env.SMTP_USER || undefined,
    pass: process.env.SMTP_PASS || undefined,
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER ?? 'TubeAi <no-reply@tubeai.app>',
  },
});
