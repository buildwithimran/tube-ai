import * as Joi from 'joi';

/**
 * Fail-fast env validation. The app refuses to boot if a required secret is
 * missing or malformed — far better than a confusing runtime crash later.
 */
export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().default(3035),
  CORS_ORIGINS: Joi.string().required(),
  ADMIN_EMAILS: Joi.string().allow('').optional(),

  MONGODB_URI: Joi.string().required(),

  REDIS_URL: Joi.string().allow('').optional(),
  REDIS_HOST: Joi.string().default('127.0.0.1'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_USERNAME: Joi.string().allow('').optional(),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_TLS: Joi.string().valid('true', 'false').optional(),

  JWT_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_TTL: Joi.string().default('15m'),
  JWT_REFRESH_TTL: Joi.string().default('7d'),

  GOOGLE_CLIENT_ID: Joi.string().allow('').optional(),
  GOOGLE_CLIENT_SECRET: Joi.string().allow('').optional(),

  // AI provider. Default Gemini (free tier). Key is required only to generate
  // content; allow empty so the app can boot for infra/auth work without it.
  AI_PROVIDER: Joi.string().valid('groq', 'gemini', 'ollama').default('groq'),
  GEMINI_API_KEY: Joi.string().allow('').optional(),
  GROQ_API_KEY: Joi.string().allow('').optional(),
  AI_MODEL_DEFAULT: Joi.string().allow('').optional(),
  AI_MODEL_STRUCTURED: Joi.string().allow('').optional(),
  AI_MODEL_CHEAP: Joi.string().allow('').optional(),
  GROQ_MODEL_DEFAULT: Joi.string().allow('').optional(),
  GROQ_MODEL_STRUCTURED: Joi.string().allow('').optional(),
  GROQ_MODEL_CHEAP: Joi.string().allow('').optional(),

  FREE_VIDEOS_PER_DAY: Joi.number().optional(),
  FREE_GENERATIONS_PER_DAY: Joi.number().optional(),
  FREE_MAX_VIDEO_SEC: Joi.number().optional(),

  SMTP_HOST: Joi.string().allow('').optional(),
  SMTP_PORT: Joi.number().optional(),
  SMTP_USER: Joi.string().allow('').optional(),
  SMTP_PASS: Joi.string().allow('').optional(),
  SMTP_FROM: Joi.string().allow('').optional(),
}).unknown(true);
