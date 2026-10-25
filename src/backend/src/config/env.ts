import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().default(3000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET cần ít nhất 32 ký tự'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),
  RATE_LIMIT_PER_MIN: z.coerce.number().int().positive().default(100),
  LOGIN_RATE_LIMIT_PER_MIN: z.coerce.number().int().positive().default(10),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new Error(`Biến môi trường không hợp lệ: ${issues}`);
  }
  return result.data;
}

const UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

export function durationToMs(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) throw new Error(`Thời hạn không hợp lệ: ${value}`);
  return Number(match[1]) * UNIT_MS[match[2]];
}
