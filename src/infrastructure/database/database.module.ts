import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AllConfigType } from '@common/config';

import { typeOrmModuleFactory } from './database.config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AllConfigType>) =>
        typeOrmModuleFactory(configService),
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
