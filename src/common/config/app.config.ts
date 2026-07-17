import { registerAs } from '@nestjs/config';

import { AppConfig } from './config.type';

export default registerAs('app', (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  name: process.env.APP_NAME ?? 'ai-platform-be',
  version: process.env.APP_VERSION ?? '1.0.0',
  port: parseInt(process.env.APP_PORT ?? '3000', 10),
  url: process.env.APP_URL ?? 'http://localhost:3000',
  apiPrefix: process.env.API_PREFIX ?? 'api',
  apiVersion: process.env.API_VERSION ?? '1',
}));
