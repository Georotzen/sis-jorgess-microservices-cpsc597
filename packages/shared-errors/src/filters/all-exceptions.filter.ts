import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorCode } from '../enums/error-code.enum';
import { ErrorResponseBody } from '../interfaces/error-response.interface';
import { AppException } from '../exceptions/app.exception';

/**
 * Global exception filter — register once per service (in main.ts via
 * `app.useGlobalFilters(new AllExceptionsFilter())`).
 *
 * Responsibilities:
 *  - Normalize every thrown error into the shared ErrorResponseBody shape.
 *  - Never leak stack traces, raw DB errors, or internal messages to the
 *    client for unhandled (non-AppException) errors — log them server-side
 *    instead and return a generic message.
 *  - Attach the correlation id (propagated from the Gateway) so an error
 *    can be traced across services in centralized logs.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const correlationId =
      (request.headers['x-correlation-id'] as string) ?? undefined;

    const { status, code, message, details } = this.resolve(exception);

    // Never log full request bodies here — they may contain grades, PII,
    // or credentials. Log identifiers/context only.
    this.logger.error(
      `[${correlationId ?? 'no-correlation-id'}] ${request.method} ${request.url} -> ${status} ${code}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    const body: ErrorResponseBody = {
      success: false,
      error: { code, message, details, correlationId },
      statusCode: status,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(body);
  }

  private resolve(exception: unknown): {
    status: number;
    code: ErrorCode;
    message: string;
    details?: Array<{ field: string; constraint: string }>;
  } {
    if (exception instanceof AppException) {
      return {
        status: exception.getStatus(),
        code: exception.errorCode,
        message: exception.message,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const responseBody = exception.getResponse();

      // class-validator's ValidationPipe throws a BadRequestException whose
      // response body is { message: string[], error, statusCode }.
      if (
        status === HttpStatus.BAD_REQUEST &&
        typeof responseBody === 'object' &&
        responseBody !== null &&
        Array.isArray((responseBody as Record<string, unknown>).message)
      ) {
        const messages = (responseBody as { message: string[] }).message;
        return {
          status,
          code: ErrorCode.VALIDATION_FAILED,
          message: 'Request validation failed',
          details: messages.map((m) => ({ field: 'unknown', constraint: m })),
        };
      }

      return {
        status,
        code: this.mapStatusToCode(status),
        message: exception.message,
      };
    }

    // Unknown / unexpected error — do not leak internals to the client.
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCode.INTERNAL_ERROR,
      message: 'An unexpected error occurred',
    };
  }

  private mapStatusToCode(status: number): ErrorCode {
    switch (status) {
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.UNAUTHENTICATED;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ErrorCode.CONFLICT;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ErrorCode.RATE_LIMITED;
      default:
        return ErrorCode.INTERNAL_ERROR;
    }
  }
}
