import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test', 'local').default('development'),
  APP_NAME: Joi.string().default('ai-platform-be'),
  APP_VERSION: Joi.string().default('1.0.0'),
  APP_PORT: Joi.number().port().default(3000),
  APP_URL: Joi.string().uri().required(),
  API_PREFIX: Joi.string().default('api'),
  API_VERSION: Joi.string().default('1'),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().port().default(5432),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required().allow(''),
  DB_DATABASE: Joi.string().required(),
  DB_SCHEMA: Joi.string().default('public'),
  DB_SSL: Joi.boolean().truthy('true').falsy('false').default(false),
  DB_LOGGING: Joi.boolean().truthy('true').falsy('false').default(false),
  DB_SYNCHRONIZE: Joi.boolean().truthy('true').falsy('false').default(false),

  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_DB: Joi.number().integer().min(0).default(0),
  REDIS_KEY_PREFIX: Joi.string().default('ai-platform:'),

  JWT_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRATION: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRATION: Joi.string().default('7d'),

  AUTH_REFRESH_COOKIE_NAME: Joi.string().default('refresh_token'),
  AUTH_REFRESH_COOKIE_SECURE: Joi.boolean().truthy('true').falsy('false').default(false),
  AUTH_REFRESH_COOKIE_SAME_SITE: Joi.string().valid('lax', 'strict', 'none').default('lax'),
  AUTH_LOCKOUT_MAX_ATTEMPTS: Joi.number().integer().positive().default(5),
  AUTH_LOCKOUT_WINDOW_SECONDS: Joi.number().integer().positive().default(900),

  // tlds: false — allow local-dev domains like admin@ai-platform.local
  BOOTSTRAP_ADMIN_EMAIL: Joi.string()
    .email({ tlds: { allow: false } })
    .optional()
    .allow(''),
  BOOTSTRAP_ADMIN_PASSWORD: Joi.string().optional().allow(''),

  THROTTLE_TTL: Joi.number().integer().positive().default(60),
  THROTTLE_LIMIT: Joi.number().integer().positive().default(100),

  CORS_ORIGINS: Joi.string().required(),

  LOG_LEVEL: Joi.string()
    .valid('fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent')
    .default('info'),

  AGENT_RUNNER: Joi.string().valid('stub', 'ollama', 'openai', 'gemini').default('stub'),
  OLLAMA_BASE_URL: Joi.string().uri().default('http://127.0.0.1:11434'),
  OLLAMA_MODEL: Joi.string().default('llama3.2'),
  OLLAMA_TIMEOUT_MS: Joi.number().integer().positive().default(120_000),
  LLM_TIMEOUT_MS: Joi.number().integer().positive().optional(),
  OPENAI_API_KEY: Joi.string().allow('').optional(),
  OPENAI_BASE_URL: Joi.string().uri().optional(),
  OPENAI_MODEL: Joi.string().optional(),
  GEMINI_API_KEY: Joi.string().allow('').optional(),
  GEMINI_MODEL: Joi.string().optional(),

  TOOL_RUNTIME: Joi.string().valid('stub', 'live').default('stub'),
  TOOL_STORAGE_ROOT: Joi.string().default('.data/tool-storage'),
  TOOL_RESULT_MAX_BYTES: Joi.number().integer().positive().default(262_144),
});
