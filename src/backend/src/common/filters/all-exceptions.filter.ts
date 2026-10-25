import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { AppRequest } from '../types';

export interface ErrorDetail {
  path: string;
  message: string;
}

export class ApiException extends HttpException {
  constructor(
    status: HttpStatus,
    message: string,
    readonly details?: ErrorDetail[],
  ) {
    super(message, status);
  }
}

const CODE_BY_STATUS: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'VALIDATION_ERROR',
  429: 'RATE_LIMITED',
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const res = http.getResponse<Response>();
    const req = http.getRequest<AppRequest>();

    if (!(exception instanceof HttpException)) {
      const status = (exception as { status?: number })?.status;
      if (status === 400 || status === 413) {
        return this.send(res, status, 'BAD_REQUEST', 'Request sai cấu trúc');
      }
      this.logger.error(
        `${req.id} ${exception instanceof Error ? exception.stack : String(exception)}`,
      );
      return this.send(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'INTERNAL_ERROR',
        'Lỗi máy chủ',
      );
    }

    const status = exception.getStatus();
    const code = CODE_BY_STATUS[status] ?? 'INTERNAL_ERROR';
    const details =
      exception instanceof ApiException ? exception.details : undefined;
    this.send(res, status, code, this.messageOf(exception), details);
  }

  private messageOf(exception: HttpException): string {
    const body = exception.getResponse();
    if (typeof body === 'string') return body;
    const message = (body as { message?: string | string[] }).message;
    return Array.isArray(message)
      ? message.join('; ')
      : (message ?? exception.message);
  }

  private send(
    res: Response,
    status: number,
    code: string,
    message: string,
    details?: ErrorDetail[],
  ) {
    res.status(status).json({
      error: { code, message, ...(details ? { details } : {}) },
    });
  }
}
