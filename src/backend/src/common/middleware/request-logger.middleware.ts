import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Response } from 'express';
import { AppRequest } from '../types';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: AppRequest, res: Response, next: NextFunction) {
    const requestId = randomUUID();
    const startedAt = Date.now();
    req.id = requestId;
    res.setHeader('X-Request-Id', requestId);

    res.on('finish', () => {
      this.logger.log(
        `${requestId} ${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - startedAt}ms`,
      );
    });
    next();
  }
}
