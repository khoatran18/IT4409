import { schoolAdminSample } from '@codeflow/schema';
import { unzipSync } from 'fflate';
import { dbProfiles } from './db-profiles';
import { generate, generateZip } from './pipeline';
import { generateSecrets } from './secrets';
import { SchemaValidationError, type DeployOptions } from './types';

const deploy: DeployOptions = {
  secrets: { dbPassword: 'db-pass-1234', jwtSecret: 'j'.repeat(48) },
  admin: { email: 'admin@shop.com', password: 'S3cret $pass #1' },
};

const byPath = async (schema: unknown, options = { deploy }) =>
  new Map(
    (await generate(schema, options)).map((f) => [f.path, f.content] as const),
  );

describe('triển khai UserApp', () => {
  it('docker-compose có db, backend, frontend và không còn dấu {{', async () => {
    const files = await byPath(schoolAdminSample);
    const compose = files.get('docker-compose.yml')!;
    expect(compose).not.toContain('{{');
    expect(compose).toContain('image: postgres:16');
    expect(compose).toContain('pg_isready');
    expect(compose).toContain('condition: service_healthy');
    expect(compose).toContain('${DB_PASSWORD:?');
    expect(compose).toContain('${JWT_SECRET:?');
    expect(compose).toContain('${FRONTEND_PORT:-8080}:80');
    expect(compose).toContain("TRUST_PROXY: '1'");
    expect(compose).toContain(
      'postgresql://${DB_USER:-app}:${DB_PASSWORD}@db:5432/${DB_NAME:-school-admin}',
    );
  });

  it('secret và admin chỉ nằm trong .env.example gốc', async () => {
    const files = await byPath(schoolAdminSample);
    const env = files.get('.env.example')!;
    expect(env).toContain('DB_PASSWORD=db-pass-1234');
    expect(env).toContain(`JWT_SECRET=${'j'.repeat(48)}`);
    expect(env).toContain("ADMIN_EMAIL='admin@shop.com'");
    expect(env).toContain("ADMIN_PASSWORD='S3cret $pass #1'");
    for (const [path, content] of files) {
      if (path === '.env.example') continue;
      expect(content).not.toContain('db-pass-1234');
      expect(content).not.toContain('S3cret');
    }
  });

  it('cùng đầu vào và cùng secret cho cùng byte zip', async () => {
    const a = await generateZip(schoolAdminSample, { deploy });
    const b = await generateZip(structuredClone(schoolAdminSample), { deploy });
    expect(Buffer.from(a.data).equals(Buffer.from(b.data))).toBe(true);
  });

  it('secret ngẫu nhiên mỗi lần và dùng được trong URL/.env', () => {
    const a = generateSecrets();
    const b = generateSecrets();
    expect(a.dbPassword).not.toBe(b.dbPassword);
    expect(a.jwtSecret.length).toBeGreaterThanOrEqual(32);
    expect(a.dbPassword).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(a.jwtSecret).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('script đúng kết thúc dòng: .sh LF, .ps1 và .bat CRLF', async () => {
    const files = await byPath(schoolAdminSample);
    for (const name of [
      'start.sh',
      'stop.sh',
      '.env.example',
      'docker-compose.yml',
    ])
      expect(files.get(name)).not.toContain('\r');
    for (const name of ['start.ps1', 'stop.ps1', 'start.bat', 'stop.bat']) {
      const content = files.get(name)!;
      expect(content).toContain('\r\n');
      expect(content.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
    }
    expect(files.get('start.sh')).toMatch(
      /^#!\/usr\/bin\/env bash\nset -euo pipefail/,
    );
    expect(files.get('start.bat')).toContain('-File "%~dp0start.ps1"');
  });

  it('mysql dùng profile mysql cho compose, prisma và .env', async () => {
    const mysql = {
      ...schoolAdminSample,
      meta: { ...schoolAdminSample.meta, database: 'mysql' },
    };
    const files = await byPath(mysql);
    expect(files.get('docker-compose.yml')).toContain("'mysqladmin', 'ping'");
    expect(files.get('docker-compose.yml')).toContain(
      'mysql://${DB_USER:-app}',
    );
    expect(files.get('.env.example')).toContain('DB_PORT=3306');
    const prisma = files.get('backend/prisma/schema.prisma')!;
    expect(prisma).toContain('provider = "mysql"');
  });

  it('registry có đủ profile theo meta.database', () => {
    expect(Object.keys(dbProfiles).sort()).toEqual(['mysql', 'postgres']);
    expect(dbProfiles.postgres.defaultPort).toBe(5432);
    expect(dbProfiles.mysql.image).toBe('mysql:8');
  });

  it('mật khẩu admin chứa ký tự không an toàn cho .env bị từ chối', async () => {
    await expect(
      generate(schoolAdminSample, {
        deploy: {
          ...deploy,
          admin: { email: 'a@b.co', password: "it's-bad-1" },
        },
      }),
    ).rejects.toThrow();
  });
});

describe('zip', () => {
  it('giải nén lại có thư mục gốc, start.sh và compose hợp lệ', async () => {
    const { name, data } = await generateZip(schoolAdminSample, { deploy });
    expect(name).toBe('school-admin');
    const entries = unzipSync(data);
    const paths = Object.keys(entries);
    expect(paths).toEqual([...paths].sort());
    expect(paths.every((p) => p.startsWith('school-admin/'))).toBe(true);
    expect(paths).toContain('school-admin/start.sh');
    expect(paths).toContain('school-admin/frontend/Dockerfile');
    const text = (p: string) => Buffer.from(entries[p]).toString('utf8');
    expect(text('school-admin/docker-compose.yml')).not.toContain('{{');
    expect(text('school-admin/start.ps1')).toContain('\r\n');
  });

  it('schema không hợp lệ ném SchemaValidationError', async () => {
    await expect(
      generateZip(
        { meta: { name: 'x' }, entities: [{ name: '1bad', fields: [] }] },
        { deploy },
      ),
    ).rejects.toBeInstanceOf(SchemaValidationError);
  });
});
