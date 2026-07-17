import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

import { AllConfigType } from '@common/config';

import { loggerModuleFactory } from './logger.config';

@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AllConfigType>) =>
        loggerModuleFactory(configService),
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}
