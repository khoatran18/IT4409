import { durationToMs, validateEnv } from './env.js';

const valid = {
  DATABASE_URL: 'postgresql://u:p@localhost:5433/db',
  REDIS_URL: 'redis://localhost:6379',
  JWT_SECRET: 'x'.repeat(32),
};

describe('validateEnv', () => {
  it('điền giá trị mặc định', () => {
    const env = validateEnv(valid);
    expect(env.PORT).toBe(3000);
    expect(env.JWT_ACCESS_TTL).toBe('15m');
    expect(env.JWT_REFRESH_TTL).toBe('7d');
  });

  it('báo biến thiếu hoặc JWT_SECRET quá ngắn', () => {
    expect(() => validateEnv({ ...valid, DATABASE_URL: undefined })).toThrow(
      /DATABASE_URL/,
    );
    expect(() => validateEnv({ ...valid, JWT_SECRET: 'ngan' })).toThrow(
      /JWT_SECRET/,
    );
  });
});

describe('durationToMs', () => {
  it('đổi 15m và 7d ra mili giây', () => {
    expect(durationToMs('15m')).toBe(900_000);
    expect(durationToMs('7d')).toBe(604_800_000);
  });

  it('từ chối định dạng lạ', () => {
    expect(() => durationToMs('abc')).toThrow();
  });
});
