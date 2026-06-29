import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { AppException } from '../exceptions/app.exception';
import type { ApiErrorResponse } from '../types/api-error-response.type';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const payload = this.toPayload(exception);
    response.status(payload.statusCode).json(payload);
  }

  private toPayload(exception: unknown): ApiErrorResponse {
    if (exception instanceof AppException) {
      return this.build(
        exception.getStatus(),
        exception.code,
        exception.message,
        exception.details,
      );
    }

    if (exception instanceof UnauthorizedException) {
      return this.build(401, 'UNAUTHORIZED', 'Unauthorized', []);
    }

    if (exception instanceof BadRequestException) {
      return this.build(400, 'VALIDATION_ERROR', 'Validation failed', []);
    }

    if (exception instanceof HttpException) {
      return this.build(exception.getStatus(), 'HTTP_ERROR', exception.message, []);
    }

    console.error('[UnhandledException]', exception);
    return this.build(500, 'INTERNAL_SERVER_ERROR', 'Internal server error', []);
  }

  private build(
    statusCode: number,
    code: string,
    message: string,
    details: ApiErrorResponse['details'],
  ): ApiErrorResponse {
    return {
      timestamp: new Date().toISOString(),
      statusCode,
      code,
      message,
      details,
    };
  }
}
