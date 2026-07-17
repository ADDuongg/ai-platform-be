import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

import { AllConfigType } from '@common/config';

export const typeOrmModuleFactory = (
  configService: ConfigService<AllConfigType>,
): TypeOrmModuleOptions => {
  const db = configService.get('database', { infer: true });

  return {
    type: 'postgres',
    host: db?.host,
    port: db?.port,
    username: db?.username,
    password: db?.password,
    database: db?.database,
    schema: db?.schema,
    ssl: db?.ssl ? { rejectUnauthorized: false } : false,
    logging: db?.logging,
    synchronize: db?.synchronize,
    autoLoadEntities: true,
    namingStrategy: new SnakeNamingStrategy(),
    migrations: [__dirname + '/migrations/*{.ts,.js}'],
    migrationsRun: false,
    entities: [__dirname + '/../../modules/**/entities/*{.ts,.js}'],
  };
};
