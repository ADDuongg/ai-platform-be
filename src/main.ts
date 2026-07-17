import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';

import { AllConfigType } from '@common/config';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService<AllConfigType>);
  const appConfig = configService.get('app', { infer: true });
  const cors = configService.get('cors', { infer: true });

  app.useLogger(app.get(Logger));

  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());

  app.enableCors({
    origin: cors?.origins ?? true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id', 'x-correlation-id'],
  });

  app.setGlobalPrefix(appConfig?.apiPrefix ?? 'api');

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: appConfig?.apiVersion ?? '1',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('AI Platform API')
    .setDescription(
      'Enterprise AI Platform Backend — production-grade NestJS foundation. ' +
        'Feature modules are isolated; infrastructure is shared via DI.',
    )
    .setVersion(appConfig?.version ?? '1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT access token',
        in: 'header',
      },
      'JWT',
    )
    .addTag('Health', 'Liveness and dependency probes')
    .addTag('Auth', 'Authentication & session management')
    .addTag('Users', 'User management')
    .addTag('Roles', 'Role & permission management')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  const port = appConfig?.port ?? 3000;
  await app.listen(port);

  const logger = app.get(Logger);
  logger.log(
    `🚀 ${appConfig?.name} v${appConfig?.version} listening on :${port} [${appConfig?.nodeEnv}]`,
  );
  logger.log(`📚 Swagger docs: ${appConfig?.url}/docs`);
}

void bootstrap();
