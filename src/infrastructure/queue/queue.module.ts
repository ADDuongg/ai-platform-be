import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

import { AllConfigType } from '@common/config';

/**
 * Infrastructure-only queue module.
 * Feature modules register their own queues via BullModule.registerQueue().
 */
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AllConfigType>) => {
        const redis = configService.get('redis', { infer: true });

        return {
          connection: {
            host: redis?.host,
            port: redis?.port,
            password: redis?.password || undefined,
            db: redis?.db,
            maxRetriesPerRequest: null,
          },
          defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 50,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 1000,
            },
          },
        };
      },
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
