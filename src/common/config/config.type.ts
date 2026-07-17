export interface AppConfig {
  nodeEnv: string;
  name: string;
  version: string;
  port: number;
  url: string;
  apiPrefix: string;
  apiVersion: string;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  schema: string;
  ssl: boolean;
  logging: boolean;
  synchronize: boolean;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
}

export interface JwtConfig {
  secret: string;
  accessExpiration: string;
  refreshExpiration: string;
  refreshCookieName: string;
  refreshCookieSecure: boolean;
  refreshCookieSameSite: 'lax' | 'strict' | 'none';
  lockoutMaxAttempts: number;
  lockoutWindowSeconds: number;
  bootstrapAdminEmail: string;
  bootstrapAdminPassword: string;
}

export interface ThrottleConfig {
  ttl: number;
  limit: number;
}

export interface CorsConfig {
  origins: string[];
}

export interface LoggerConfig {
  level: string;
}

export interface AgentRunnerConfig {
  /** stub | ollama | openai | gemini */
  mode: 'stub' | 'ollama' | 'openai' | 'gemini';
  /** Default model for the active live provider (override via Agent config / Prompt modelHints). */
  defaultModel: string;
  timeoutMs: number;
  ollama: {
    baseUrl: string;
    model: string;
  };
  /** Reserved for future OpenAI adapter */
  openai: {
    apiKey: string;
    baseUrl: string;
    model: string;
  };
  /** Reserved for future Gemini adapter */
  gemini: {
    apiKey: string;
    model: string;
  };
}

export interface ToolRuntimeConfig {
  /** stub | live — default stub keeps CI offline-safe */
  mode: 'stub' | 'live';
  storageRoot: string;
  resultMaxBytes: number;
}

export interface AllConfigType {
  app: AppConfig;
  database: DatabaseConfig;
  redis: RedisConfig;
  jwt: JwtConfig;
  throttle: ThrottleConfig;
  cors: CorsConfig;
  logger: LoggerConfig;
  agentRunner: AgentRunnerConfig;
  toolRuntime: ToolRuntimeConfig;
}
