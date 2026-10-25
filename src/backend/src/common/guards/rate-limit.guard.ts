import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import { Redis } from 'ioredis';
import { ConfigService } from '../../config/config.service';
import { REDIS } from '../../redis/redis.module';
import {
  RATE_LIMIT_KEY,
  RateLimitScope,
} from '../decorators/rate-limit.decorator';
import { AppRequest } from '../types';

const WINDOW_SECONDS = 60;

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const req = http.getRequest<AppRequest>();
    const res = http.getResponse<Response>();

    const scope =
      this.reflector.getAllAndOverride<RateLimitScope | undefined>(
        RATE_LIMIT_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? 'default';
    const limit =
      scope === 'login'
        ? this.config.env.LOGIN_RATE_LIMIT_PER_MIN
        : this.config.env.RATE_LIMIT_PER_MIN;

    const key = `rate:${scope}:${req.ip}`;
    let count: number;
    let ttl: number;
    try {
      count = await this.redis.incr(key);
      if (count === 1) await this.redis.expire(key, WINDOW_SECONDS);
      ttl = await this.redis.ttl(key);
    } catch (err) {
      this.logger.warn(
        `Redis lỗi, bỏ qua rate limit: ${(err as Error).message}`,
      );
      return true;
    }

    if (count > limit) {
      res.setHeader('Retry-After', String(ttl > 0 ? ttl : WINDOW_SECONDS));
      throw new HttpException(
        'Quá nhiều yêu cầu',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
