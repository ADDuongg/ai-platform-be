import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';

import { SuccessResponseDto } from '../dto';

export interface ResponseMeta {
  [key: string]: unknown;
}

/**
 * Wraps every successful controller response into a standard envelope.
 * Controllers may return `{ data, meta }` or a plain value.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, SuccessResponseDto<T>> {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<SuccessResponseDto<T>> {
    return next.handle().pipe(
      map((payload: unknown) => {
        if (this.isAlreadyEnveloped(payload)) {
          return payload as SuccessResponseDto<T>;
        }

        if (this.hasDataMetaShape(payload)) {
          return {
            success: true as const,
            data: payload.data as T,
            meta: payload.meta ?? {},
          };
        }

        return {
          success: true as const,
          data: payload as T,
          meta: {},
        };
      }),
    );
  }

  private isAlreadyEnveloped(payload: unknown): boolean {
    return (
      typeof payload === 'object' &&
      payload !== null &&
      'success' in payload &&
      payload.success === true &&
      'data' in payload
    );
  }

  private hasDataMetaShape(payload: unknown): payload is { data: unknown; meta?: ResponseMeta } {
    return (
      typeof payload === 'object' &&
      payload !== null &&
      'data' in payload &&
      !('success' in payload)
    );
  }
}
