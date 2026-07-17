import { HttpException, HttpStatus } from '@nestjs/common';

import { ERROR_CODES, ErrorCode } from '../constants';

export interface AppExceptionOptions {
  code?: ErrorCode;
  details?: unknown;
  cause?: unknown;
}

/**
 * Domain exception with a stable error code for clients.
 */
export class AppException extends HttpException {
  public readonly code: ErrorCode;
  public readonly details: unknown;

  constructor(
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    options: AppExceptionOptions = {},
  ) {
    super(
      {
        code: options.code ?? ERROR_CODES.BAD_REQUEST,
        message,
        details: options.details ?? null,
      },
      status,
    );
    this.code = options.code ?? ERROR_CODES.BAD_REQUEST;
    this.details = options.details ?? null;
  }
}

export class NotFoundException extends AppException {
  constructor(message = 'Resource not found', details?: unknown) {
    super(message, HttpStatus.NOT_FOUND, {
      code: ERROR_CODES.NOT_FOUND,
      details,
    });
  }
}

export class ConflictException extends AppException {
  constructor(message = 'Resource conflict', details?: unknown) {
    super(message, HttpStatus.CONFLICT, {
      code: ERROR_CODES.CONFLICT,
      details,
    });
  }
}

export class UnauthorizedException extends AppException {
  constructor(message = 'Unauthorized', code: ErrorCode = ERROR_CODES.UNAUTHORIZED) {
    super(message, HttpStatus.UNAUTHORIZED, { code });
  }
}

export class ForbiddenException extends AppException {
  constructor(message = 'Forbidden', details?: unknown) {
    super(message, HttpStatus.FORBIDDEN, {
      code: ERROR_CODES.FORBIDDEN,
      details,
    });
  }
}
