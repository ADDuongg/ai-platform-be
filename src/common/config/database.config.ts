import { registerAs } from '@nestjs/config';

import { DatabaseConfig } from './config.type';

export default registerAs('database', (): DatabaseConfig => ({
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME ?? 'ai_platform',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_DATABASE ?? 'ai_platform',
  schema: process.env.DB_SCHEMA ?? 'public',
  ssl: process.env.DB_SSL === 'true',
  logging: process.env.DB_LOGGING === 'true',
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
}));
