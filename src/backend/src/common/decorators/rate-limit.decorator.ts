import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rateLimit';
export type RateLimitScope = 'login';
export const RateLimit = (scope: RateLimitScope) =>
  SetMetadata(RATE_LIMIT_KEY, scope);
