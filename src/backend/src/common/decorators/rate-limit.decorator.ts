import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rateLimit';
export type RateLimitScope = 'login' | 'generate';
export const RateLimit = (scope: RateLimitScope) =>
  SetMetadata(RATE_LIMIT_KEY, scope);
