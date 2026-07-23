import appConfig from './app.config';
import databaseConfig from './database.config';
import jwtConfig from './jwt.config';
import {
  corsConfig,
  loggerConfig,
  throttleConfig,
  agentRunnerConfig,
  toolRuntimeConfig,
  artifactStorageConfig,
} from './misc.config';
import redisConfig from './redis.config';
import { envValidationSchema } from './env.validation';

export * from './config.type';
export { envValidationSchema };

export const configLoaders = [
  appConfig,
  databaseConfig,
  redisConfig,
  jwtConfig,
  throttleConfig,
  corsConfig,
  loggerConfig,
  agentRunnerConfig,
  toolRuntimeConfig,
  artifactStorageConfig,
];
