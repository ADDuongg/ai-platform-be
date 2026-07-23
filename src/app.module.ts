import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AllConfigType, configLoaders, envValidationSchema } from '@common/config';
import { GlobalExceptionFilter } from '@common/filters';
import { JwtAuthGuard, PermissionsGuard } from '@common/guards';
import { ResponseInterceptor } from '@common/interceptors';
import { DatabaseModule } from '@infrastructure/database';
import { LoggerModule } from '@infrastructure/logger';
import { QueueModule } from '@infrastructure/queue';
import { RedisModule } from '@infrastructure/redis';
import { AuthModule } from '@modules/auth/auth.module';
import { AgentsModule } from '@modules/agents/agents.module';
import { AuditModule } from '@modules/audit/audit.module';
import { PromptsModule } from '@modules/prompts/prompts.module';
import { ToolsModule } from '@modules/tools/tools.module';
import { HealthModule } from '@modules/health/health.module';
import { LlmModule } from '@modules/llm/llm.module';
import { UsersModule } from '@modules/users/users.module';
import { WorkflowsModule } from '@modules/workflows/workflows.module';
import { ExecutionsModule } from '@modules/executions/executions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      envFilePath: [
        '.env',
        `.env.${process.env.NODE_ENV ?? 'development'}.local`,
        `.env.${process.env.NODE_ENV ?? 'development'}`,
        '.env.local',
      ],
      load: configLoaders,
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: false,
        allowUnknown: true,
      },
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AllConfigType>) => {
        const throttle = configService.get('throttle', { infer: true });
        return [
          {
            ttl: (throttle?.ttl ?? 60) * 1000,
            limit: throttle?.limit ?? 100,
          },
        ];
      },
    }),
    LoggerModule,
    DatabaseModule,
    RedisModule,
    QueueModule,
    AuthModule,
    UsersModule,
    AuditModule,
    AgentsModule,
    PromptsModule,
    ToolsModule,
    LlmModule,
    WorkflowsModule,
    ExecutionsModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule {}
