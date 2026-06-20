import { Type } from '@google/genai';
import { ContentType } from '../../common/enums/content-type.enum';

export type ModelTier = 'default' | 'structured' | 'cheap';

export interface PromptSpec {
  tier: ModelTier;
  system: string;
  prompt: string;
  json: boolean;
  schema?: unknown;
}

export interface PromptContext {
  title?: string;
  channel?: string;
  transcript: string;
  language: string;
}

const QUIZ_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          options: { type: Type.ARRAY, items: { type: Type.STRING } },
          answerIndex: { type: Type.INTEGER },
          explanation: { type: Type.STRING },
        },
        required: ['question', 'options', 'answerIndex', 'explanation'],
      },
    },
  },
  required: ['questions'],
};

const FLASHCARDS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    cards: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          front: { type: Type.STRING },
          back: { type: Type.STRING },
        },
        required: ['front', 'back'],
      },
    },
  },
  required: ['cards'],
};

const BASE_SYSTEM =
  'You are TubeAi, an expert learning assistant. You turn a YouTube video transcript ' +
  'into accurate, well-structured study material. Only use information present in the ' +
  'transcript — never invent facts. Write in the requested language.';

const head = (ctx: PromptContext) =>
  `Video: "${ctx.title ?? 'Untitled'}"${ctx.channel ? ` by ${ctx.channel}` : ''}.\n` +
  `Output language: ${ctx.language}.\n\nTRANSCRIPT:\n${ctx.transcript}\n\n`;

/** Builds the prompt + model tier + (optional) JSON schema for a content type. */
export function buildPrompt(
  type: ContentType,
  ctx: PromptContext,
): PromptSpec {
  switch (type) {
    case ContentType.SUMMARY_SHORT:
      return {
        tier: 'cheap',
        system: BASE_SYSTEM,
        json: false,
        prompt:
          head(ctx) +
          'Write a tight 3–4 sentence summary capturing the core message.',
      };

    case ContentType.SUMMARY_LONG:
      return {
        tier: 'default',
        system: BASE_SYSTEM,
        json: false,
        prompt:
          head(ctx) +
          'Write a detailed summary in Markdown: a short intro, then the key ideas as ' +
          'organized paragraphs with subheadings. Be thorough but skip filler.',
      };

    case ContentType.CHAPTER_NOTES:
      return {
        tier: 'default',
        system: BASE_SYSTEM,
        json: false,
        prompt:
          head(ctx) +
          'Produce structured study notes in Markdown, broken into logical sections ' +
          'with `##` headings and concise bullet points under each. Bold key terms.',
      };

    case ContentType.KEY_TAKEAWAYS:
      return {
        tier: 'cheap',
        system: BASE_SYSTEM,
        json: false,
        prompt:
          head(ctx) +
          'List the 5–8 most important takeaways as a Markdown bullet list. Each ' +
          'takeaway one clear, self-contained sentence.',
      };

    case ContentType.QUIZ:
      return {
        tier: 'structured',
        system: BASE_SYSTEM,
        json: true,
        schema: QUIZ_SCHEMA,
        prompt:
          head(ctx) +
          'Create 5 multiple-choice questions that test understanding of the video. ' +
          'Base every question strictly on the transcript.\n' +
          'Respond with ONLY valid JSON of this exact shape:\n' +
          '{"questions":[{"question":"string","options":["a","b","c","d"],' +
          '"answerIndex":0,"explanation":"string"}]}\n' +
          'answerIndex is the 0-based index (0-3) of the correct option.',
      };

    case ContentType.FLASHCARDS:
      return {
        tier: 'structured',
        system: BASE_SYSTEM,
        json: true,
        schema: FLASHCARDS_SCHEMA,
        prompt:
          head(ctx) +
          'Create 8–12 active-recall flashcards covering the most important concepts.\n' +
          'Respond with ONLY valid JSON of this exact shape:\n' +
          '{"cards":[{"front":"question or prompt","back":"concise answer"}]}',
      };

    // --- Phase 1.5 repurposing outputs (Pro) ---------------------------------
    case ContentType.LINKEDIN_POST:
      return {
        tier: 'default',
        system: BASE_SYSTEM,
        json: false,
        prompt:
          head(ctx) +
          'Write an engaging LinkedIn post (150–220 words) sharing the key insight, ' +
          'with a strong hook, 2–3 short takeaways, and a closing question. No hashtags spam.',
      };

    case ContentType.TWITTER_THREAD:
      return {
        tier: 'default',
        system: BASE_SYSTEM,
        json: false,
        prompt:
          head(ctx) +
          'Write a 6–8 tweet thread. Number each tweet. Strong hook first, one idea per ' +
          'tweet, a clear takeaway last. Keep each tweet under 280 characters.',
      };

    case ContentType.BLOG_OUTLINE:
      return {
        tier: 'default',
        system: BASE_SYSTEM,
        json: false,
        prompt:
          head(ctx) +
          'Create a blog post outline in Markdown: a working title, intro angle, 4–6 ' +
          'H2 sections each with 2–3 bullet sub-points, and a conclusion.',
      };

    case ContentType.YOUTUBE_DESCRIPTION:
      return {
        tier: 'cheap',
        system: BASE_SYSTEM,
        json: false,
        prompt:
          head(ctx) +
          'Write an SEO-friendly YouTube description: a 2–3 sentence summary, then a ' +
          'bulleted list of what viewers will learn. Keep it natural.',
      };

    default:
      return {
        tier: 'default',
        system: BASE_SYSTEM,
        json: false,
        prompt: head(ctx) + 'Summarize this video.',
      };
  }
}
