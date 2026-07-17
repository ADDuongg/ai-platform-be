import { ConfigService } from '@nestjs/config';
import { Params } from 'nestjs-pino';
import { IncomingMessage, ServerResponse } from 'http';
import { randomUUID } from 'crypto';

import { AllConfigType } from '@common/config';
import { Environment } from '@common/enums';

export const loggerModuleFactory = (configService: ConfigService<AllConfigType>): Params => {
  const app = configService.get('app', { infer: true });
  const logger = configService.get('logger', { infer: true });
  const isDev = app?.nodeEnv === Environment.DEVELOPMENT || app?.nodeEnv === Environment.LOCAL;

  return {
    pinoHttp: {
      level: logger?.level ?? 'info',
      genReqId: (req: IncomingMessage, res: ServerResponse) => {
        const existing =
          (req.headers['x-request-id'] as string | undefined) ??
          (req.headers['x-correlation-id'] as string | undefined);
        const id = existing ?? randomUUID();
        res.setHeader('x-request-id', id);
        return id;
      },
      customProps: () => ({
        context: 'HTTP',
        service: app?.name,
        version: app?.version,
      }),
      transport: isDev
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              singleLine: false,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
      serializers: {
        req: (req: IncomingMessage & { id?: string }) => ({
          id: req.id,
          method: req.method,
          url: req.url,
        }),
        res: (res: ServerResponse) => ({
          statusCode: res.statusCode,
        }),
        err: (err: Error) => ({
          type: err.name,
          message: err.message,
          stack: err.stack,
        }),
      },
      autoLogging: {
        ignore: (req: IncomingMessage) =>
          req.url?.includes('/health') === true || req.url?.includes('/docs') === true,
      },
      customLogLevel: (_req: IncomingMessage, res: ServerResponse, err?: Error) => {
        if (err || res.statusCode >= 500) {
          return 'error';
        }
        if (res.statusCode >= 400) {
          return 'warn';
        }
        return 'info';
      },
      customSuccessMessage: (req: IncomingMessage, res: ServerResponse, responseTime: number) =>
        `${req.method} ${req.url} ${res.statusCode} - ${responseTime}ms`,
      customErrorMessage: (req: IncomingMessage, res: ServerResponse, err: Error) =>
        `${req.method} ${req.url} ${res.statusCode} - ${err.message}`,
    },
  };
};
