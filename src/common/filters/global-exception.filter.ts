/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

import { ERROR_CODES } from '../constants';
import { AppException } from '../exceptions';
import { ErrorResponseDto } from '../dto';

interface ValidationErrorBody {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, code, message, details } = this.normalizeException(exception);

    if (status >= (HttpStatus.INTERNAL_SERVER_ERROR as number)) {
      this.logger.error(
        {
          err: exception,
          path: request.url,
          method: request.method,
        },
        message,
      );
    } else {
      this.logger.warn({ path: request.url, code, message }, 'Client error');
    }

    const body: ErrorResponseDto = {
      success: false,
      error: {
        code,
        message,
        details,
      },
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(body);
  }

  private normalizeException(exception: unknown): {
    status: number;
    code: string;
    message: string;
    details: unknown;
  } {
    if (exception instanceof AppException) {
      return {
        status: exception.getStatus(),
        code: exception.code,
        message: exception.message,
        details: exception.details,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        return {
          status,
          code: this.mapStatusToCode(status),
          message: exceptionResponse,
          details: null,
        };
      }

      return this.formatHttpExceptionBody(
        status,
        exceptionResponse as ValidationErrorBody,
        exception,
      );
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      details: null,
    };
  }

  private formatHttpExceptionBody(
    status: number,
    body: ValidationErrorBody,
    exception: HttpException,
  ): {
    status: number;
    code: string;
    message: string;
    details: unknown;
  } {
    const isValidation =
      status === (HttpStatus.BAD_REQUEST as number) && Array.isArray(body.message);
    if (isValidation) {
      return {
        status,
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Validation failed',
        details: body.message,
      };
    }

    const message = Array.isArray(body.message)
      ? body.message.join('; ')
      : (body.message ?? exception.message);

    return {
      status,
      code: this.mapStatusToCode(status),
      message,
      details: null,
    };
  }

  private mapStatusToCode(status: number): string {
    switch (status as HttpStatus) {
      case HttpStatus.BAD_REQUEST:
        return ERROR_CODES.BAD_REQUEST;
      case HttpStatus.UNAUTHORIZED:
        return ERROR_CODES.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ERROR_CODES.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ERROR_CODES.NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ERROR_CODES.CONFLICT;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ERROR_CODES.TOO_MANY_REQUESTS;
      default:
        return ERROR_CODES.INTERNAL_SERVER_ERROR;
    }
  }
}
