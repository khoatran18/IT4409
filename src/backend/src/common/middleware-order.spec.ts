import {
  Controller,
  Get,
  INestApplication,
  MiddlewareConsumer,
  Module,
  NestModule,
} from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ConfigService } from '../config/config.service';
import { parseTrustProxy } from '../config/env';
import { REDIS } from '../redis/redis.module';
import { Public } from './decorators/public.decorator';
import { Roles } from './decorators/roles.decorator';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { RolesGuard } from './guards/roles.guard';
import { RequestLoggerMiddleware } from './middleware/request-logger.middleware';

@Controller('probe')
class ProbeController {
  @Public()
  @Get('open')
  open() {
    return 'open';
  }

  @Roles('admin')
  @Get('admin')
  admin() {
    return 'admin';
  }
}

class FakeRedis {
  counts = new Map<string, number>();
  failing = false;
  keys: string[] = [];

  incr(key: string) {
    if (this.failing) return Promise.reject(new Error('redis down'));
    this.keys.push(key);
    const next = (this.counts.get(key) ?? 0) + 1;
    this.counts.set(key, next);
    return Promise.resolve(next);
  }
  expire() {
    return Promise.resolve(1);
  }
  ttl() {
    return Promise.resolve(30);
  }
}

const LIMIT = 3;
const SECRET = 'x'.repeat(32);

@Module({
  imports: [JwtModule.register({ secret: SECRET })],
  controllers: [ProbeController],
  providers: [
    { provide: REDIS, useClass: FakeRedis },
    {
      provide: ConfigService,
      useValue: {
        env: { RATE_LIMIT_PER_MIN: LIMIT, LOGIN_RATE_LIMIT_PER_MIN: 1 },
      },
    },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
class ProbeModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*path');
  }
}

describe('middleware 4 lớp của Studio', () => {
  let app: INestApplication;
  let redis: FakeRedis;
  let jwt: JwtService;

  async function boot(trustProxy: string) {
    const moduleRef = await Test.createTestingModule({
      imports: [ProbeModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app
      .getHttpAdapter()
      .getInstance()
      .set('trust proxy', parseTrustProxy(trustProxy));
    await app.init();
    redis = app.get<FakeRedis>(REDIS);
    jwt = app.get(JwtService);
  }

  const token = (role: string) => jwt.signAsync({ sub: 'u1', role });
  const http = () => request(app.getHttpServer());

  afterEach(() => app.close());

  it('logging chạy đầu tiên: X-Request-Id có cả ở response 429 và 401', async () => {
    await boot('false');
    const unauth = await http().get('/probe/admin').expect(401);
    expect(unauth.headers['x-request-id']).toBeDefined();
    for (let i = 0; i < LIMIT; i++) await http().get('/probe/open');
    const limited = await http().get('/probe/open').expect(429);
    expect(limited.headers['x-request-id']).toBeDefined();
    expect(limited.headers['retry-after']).toBe('30');
  });

  it('rate limit chạy trước parse token: request chưa đăng nhập bị 429 chứ không phải 401', async () => {
    await boot('false');
    for (let i = 0; i < LIMIT; i++)
      await http().get('/probe/admin').expect(401);
    await http().get('/probe/admin').expect(429);
  });

  it('parse token chạy trước RBAC: không token là 401, sai role là 403, đúng role là 200', async () => {
    await boot('false');
    await http().get('/probe/admin').expect(401);
    await http()
      .get('/probe/admin')
      .set('Authorization', `Bearer ${await token('user')}`)
      .expect(403);
    await http()
      .get('/probe/admin')
      .set('Authorization', `Bearer ${await token('admin')}`)
      .expect(200);
  });

  it('Redis lỗi thì bỏ qua rate limit (fail-open)', async () => {
    await boot('false');
    redis.failing = true;
    for (let i = 0; i < LIMIT + 2; i++)
      await http().get('/probe/open').expect(200);
  });

  it('không tin proxy thì mọi X-Forwarded-For dùng chung một khóa theo IP kết nối', async () => {
    await boot('false');
    for (let i = 0; i < LIMIT; i++) {
      await http()
        .get('/probe/open')
        .set('X-Forwarded-For', `10.0.0.${i}`)
        .expect(200);
    }
    await http()
      .get('/probe/open')
      .set('X-Forwarded-For', '10.0.0.99')
      .expect(429);
  });

  it('TRUST_PROXY=1 thì khóa rate limit lấy từ X-Forwarded-For', async () => {
    await boot('1');
    for (let i = 0; i < LIMIT; i++) {
      await http()
        .get('/probe/open')
        .set('X-Forwarded-For', '10.0.0.1')
        .expect(200);
    }
    await http()
      .get('/probe/open')
      .set('X-Forwarded-For', '10.0.0.1')
      .expect(429);
    await http()
      .get('/probe/open')
      .set('X-Forwarded-For', '10.0.0.2')
      .expect(200);
    expect(redis.keys).toContain('rate:default:10.0.0.2');
  });
});
