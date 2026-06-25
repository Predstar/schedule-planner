import { HttpException } from '@nestjs/common';
import type { ErrorDetail } from '../types/api-error-response.type';

export class AppException extends HttpException {
  constructor(
    statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details: ErrorDetail[] = [],
  ) {
    super(message, statusCode);
  }
}
