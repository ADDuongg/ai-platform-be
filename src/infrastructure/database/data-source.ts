import { DataSource, DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';

dotenvConfig({ path: resolve(process.cwd(), '.env') });
dotenvConfig({ path: resolve(process.cwd(), `.env.${process.env.NODE_ENV ?? 'development'}`) });

const options: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME ?? 'ai_platform',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_DATABASE ?? 'ai_platform',
  schema: process.env.DB_SCHEMA ?? 'public',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  logging: process.env.DB_LOGGING === 'true',
  synchronize: false,
  namingStrategy: new SnakeNamingStrategy(),
  entities: [resolve(__dirname, '../../modules/**/entities/*{.ts,.js}')],
  migrations: [resolve(__dirname, './migrations/*{.ts,.js}')],
};

export default new DataSource(options);
