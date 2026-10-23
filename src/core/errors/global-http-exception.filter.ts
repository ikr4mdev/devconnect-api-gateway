import { AppErrorCode } from '@devconnect-microservices/devconnect-contracts';
import { Metadata } from '@grpc/grpc-js';
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { mapHttp } from './grpc-to-http.mapper';

const metadataKey = 'app-error-code';

type GrpcErrorShape = {
  code: number;
  details: string;
  metadata: Metadata;
};

function isGrpcException(exception: unknown): exception is GrpcErrorShape {
  if (typeof exception !== 'object' || exception === null) {
    return false;
  }

  const candidate = exception as {
    code?: unknown;
    details?: unknown;
    metadata?: unknown;
  };

  return (
    typeof candidate.code === 'number' &&
    typeof candidate.details === 'string' &&
    candidate.metadata instanceof Metadata
  );
}

const VALID_APP_ERROR_CODES = new Set<string>(Object.values(AppErrorCode));

function isValidAppErrorCode(value: unknown): value is AppErrorCode {
  return typeof value === 'string' && VALID_APP_ERROR_CODES.has(value);
}

function describeException(exception: unknown): string {
  if (exception instanceof Error) {
    return exception.stack ?? `${exception.name}: ${exception.message}`;
  }
  try {
    return JSON.stringify(exception);
  } catch {
    return String(exception);
  }
}

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (isGrpcException(exception)) {
      const values = exception.metadata.get(metadataKey);

      const raw = values[0];

      if (isValidAppErrorCode(raw)) {
        const { status, message } = mapHttp(raw);
        response.status(status).json({
          statusCode: status,
          code: raw,
          message,
          path: request.url,
        });
        return;
      }
      this.logger.debug(
        `gRPC status=${exception.code}, details=${exception.details}, app-error-code=${JSON.stringify(values)}`,
      );

      this.logger.warn(
        `Unrecognized app error code from upstream: ${String(raw)}`,
      );
      response.status(HttpStatus.BAD_GATEWAY).json({
        statusCode: HttpStatus.BAD_GATEWAY,
        code: null,
        message: 'Upstream service returned an unrecognized error.',
        path: request.url,
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const message = sanitizeHttpExceptionMessage(exception);

      response.status(status).json({
        statusCode: status,
        code: null,
        message,
        path: request.url,
      });
      return;
    }

    this.logger.error(
      `Unexpected exception on ${request.method} ${request.url}\n${describeException(exception)}`,
    );
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: null,
      message: 'Something went wrong on our end. Please try again later.',
      path: request.url,
    });
  }
}

function sanitizeHttpExceptionMessage(exception: HttpException): string {
  const response = exception.getResponse();

  if (typeof response === 'string') {
    return response;
  }

  if (
    typeof response === 'object' &&
    response !== null &&
    'message' in response
  ) {
    const message = (response as { message: unknown }).message;

    if (typeof message === 'string') {
      return message;
    }

    // Validation pipes often return an array of messages.
    if (Array.isArray(message) && message.every((m) => typeof m === 'string')) {
      return message.join('; ');
    }
  }

  return 'Request could not be processed.';
}
