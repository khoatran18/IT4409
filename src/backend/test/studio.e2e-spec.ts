import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createEmptyProject, schoolAdminSample } from '@codeflow/schema';
import { Redis } from 'ioredis';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import { ConfigService } from '../src/config/config.service';
import { PrismaService } from '../src/prisma/prisma.service';

const API = '/api/v1';
const password = 'password123';
const runId = Date.now();
const email = (name: string) => `${name}-${runId}@e2e.test`;

describe('Studio API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: Redis;

  const http = () => request(app.getHttpServer());
  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    redis = new Redis(app.get(ConfigService).env.REDIS_URL);
  });

  async function resetRateLimits() {
    const keys = await redis.keys('rate:*');
    if (keys.length) await redis.del(keys);
  }

  beforeEach(resetRateLimits);

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { endsWith: `-${runId}@e2e.test` } },
    });
    await redis.quit();
    await app.close();
  });

  async function register(name: string) {
    const res = await http()
      .post(`${API}/auth/register`)
      .send({ email: email(name), password })
      .expect(201);
    return res.body.data as {
      accessToken: string;
      refreshToken: string;
      user: { id: string; role: string };
    };
  }

  async function loginAs(name: string) {
    const res = await http()
      .post(`${API}/auth/login`)
      .send({ email: email(name), password })
      .expect(200);
    return res.body.data.accessToken as string;
  }

  describe('auth', () => {
    it('đăng ký, đăng nhập, me, refresh, logout', async () => {
      const registered = await register('auth');
      expect(registered.user.role).toBe('user');

      const login = await http()
        .post(`${API}/auth/login`)
        .send({ email: email('auth'), password })
        .expect(200);
      expect(login.headers['x-request-id']).toBeDefined();
      const { accessToken, refreshToken } = login.body.data;

      const me = await http()
        .get(`${API}/auth/me`)
        .set(bearer(accessToken))
        .expect(200);
      expect(me.body.data.email).toBe(email('auth'));

      const refreshed = await http()
        .post(`${API}/auth/refresh`)
        .send({ refreshToken })
        .expect(200);
      expect(refreshed.body.data.refreshToken).not.toBe(refreshToken);
      await http()
        .post(`${API}/auth/refresh`)
        .send({ refreshToken })
        .expect(401);

      await http()
        .post(`${API}/auth/logout`)
        .set(bearer(accessToken))
        .send({ refreshToken: refreshed.body.data.refreshToken })
        .expect(204);
      await http()
        .post(`${API}/auth/refresh`)
        .send({ refreshToken: refreshed.body.data.refreshToken })
        .expect(401);
    });

    it('trả lỗi theo bảng mã', async () => {
      await register('dup');
      const dup = await http()
        .post(`${API}/auth/register`)
        .send({ email: email('dup'), password })
        .expect(409);
      expect(dup.body.error.code).toBe('CONFLICT');

      const invalid = await http()
        .post(`${API}/auth/register`)
        .send({ email: 'x', password: '1' })
        .expect(422);
      expect(invalid.body.error.code).toBe('VALIDATION_ERROR');
      expect(invalid.body.error.details[0]).toHaveProperty('path');

      const wrong = await http()
        .post(`${API}/auth/login`)
        .send({ email: email('dup'), password: 'sai-mat-khau' })
        .expect(401);
      expect(wrong.body.error.code).toBe('UNAUTHENTICATED');

      const noToken = await http().get(`${API}/auth/me`).expect(401);
      expect(noToken.body.error.code).toBe('UNAUTHENTICATED');

      const badJson = await http()
        .post(`${API}/auth/login`)
        .set('Content-Type', 'application/json')
        .send('{bad')
        .expect(400);
      expect(badJson.body.error.code).toBe('BAD_REQUEST');
    });

    it('giới hạn đăng nhập theo IP trả 429 kèm Retry-After', async () => {
      const limit = app.get(ConfigService).env.LOGIN_RATE_LIMIT_PER_MIN;
      for (let i = 0; i < limit; i++) {
        await http()
          .post(`${API}/auth/login`)
          .send({ email: email('rl'), password })
          .expect(401);
      }
      const blocked = await http()
        .post(`${API}/auth/login`)
        .send({ email: email('rl'), password })
        .expect(429);
      expect(blocked.body.error.code).toBe('RATE_LIMITED');
      expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
    });
  });

  describe('projects', () => {
    let staffToken: string;
    let otherToken: string;
    let projectId: string;

    beforeAll(async () => {
      await resetRateLimits();
      const staff = await register('staff');
      await prisma.user.update({
        where: { id: staff.user.id },
        data: { role: 'staff' },
      });
      staffToken = await loginAs('staff');
      otherToken = (await register('other')).accessToken;
    });

    it('role user không tạo được project', async () => {
      const res = await http()
        .post(`${API}/projects`)
        .set(bearer(otherToken))
        .send({ name: 'x' })
        .expect(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('staff tạo project với schema rỗng và version 1', async () => {
      const res = await http()
        .post(`${API}/projects`)
        .set(bearer(staffToken))
        .send({ name: 'Shop' })
        .expect(201);
      projectId = res.body.data.id;
      expect(res.body.data.version).toBe(1);
      expect(res.body.data.schema).toEqual(createEmptyProject('Shop'));
    });

    it('danh sách có meta, người khác không thấy project này', async () => {
      const mine = await http()
        .get(`${API}/projects`)
        .set(bearer(staffToken))
        .expect(200);
      expect(mine.body.meta).toEqual({ page: 1, pageSize: 10, total: 1 });
      expect(mine.body.data[0]).not.toHaveProperty('schema');

      const theirs = await http()
        .get(`${API}/projects`)
        .set(bearer(otherToken))
        .expect(200);
      expect(theirs.body.data).toEqual([]);
      await http()
        .get(`${API}/projects/${projectId}`)
        .set(bearer(otherToken))
        .expect(404);
    });

    it('PUT đúng version tăng version, sai version trả 409', async () => {
      const ok = await http()
        .put(`${API}/projects/${projectId}`)
        .set(bearer(staffToken))
        .send({ schema: schoolAdminSample, version: 1 })
        .expect(200);
      expect(ok.body.data.version).toBe(2);
      expect(ok.body.data.name).toBe('school-admin');

      const stale = await http()
        .put(`${API}/projects/${projectId}`)
        .set(bearer(staffToken))
        .send({ schema: schoolAdminSample, version: 1 })
        .expect(409);
      expect(stale.body.error.code).toBe('CONFLICT');
    });

    it('schema sai trả 422 kèm đường dẫn', async () => {
      const res = await http()
        .put(`${API}/projects/${projectId}`)
        .set(bearer(staffToken))
        .send({
          schema: {
            ...schoolAdminSample,
            entities: [{ name: '1bad', fields: [] }],
          },
          version: 2,
        })
        .expect(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details[0].path).toBe('schema.entities.0.name');
    });

    it('chỉ admin xóa được project', async () => {
      await http()
        .delete(`${API}/projects/${projectId}`)
        .set(bearer(staffToken))
        .expect(403);
      const admin = await register('admin');
      await prisma.user.update({
        where: { id: admin.user.id },
        data: { role: 'admin' },
      });
      const adminToken = await loginAs('admin');
      await http()
        .get(`${API}/projects/${projectId}`)
        .set(bearer(adminToken))
        .expect(200);
      await http()
        .delete(`${API}/projects/${projectId}`)
        .set(bearer(adminToken))
        .expect(204);
      await http()
        .get(`${API}/projects/${projectId}`)
        .set(bearer(adminToken))
        .expect(404);
    });
  });
});
