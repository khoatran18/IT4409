import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createEmptyProject, schoolAdminSample } from '@codeflow/schema';
import { generate } from './pipeline';
import { buildContext } from './steps/build-context';
import { nameForms, normalize } from './steps/normalize';
import { SchemaValidationError } from './types';

describe('generator pipeline', () => {
  it('sinh đúng bộ file từ schema mẫu', () => {
    const files = generate(schoolAdminSample);
    expect(files.map((f) => f.path)).toEqual([
      'backend/package.json',
      'backend/prisma/schema.prisma',
      'backend/src/modules/student/student.routes.ts',
      'backend/src/server.ts',
      'docker-compose.yml',
    ]);
  });

  it('khớp snapshot', () => {
    expect(generate(schoolAdminSample)).toMatchSnapshot();
  });

  it('xác định: cùng input cho cùng output', () => {
    expect(generate(structuredClone(schoolAdminSample))).toEqual(
      generate(schoolAdminSample),
    );
  });

  it('prisma schema có model và field từ entity', () => {
    const prisma = generate(schoolAdminSample).find(
      (f) => f.path === 'backend/prisma/schema.prisma',
    );
    expect(prisma?.content).toContain('model Student {');
    expect(prisma?.content).toContain('name String');
    expect(prisma?.content).toContain('email String? @unique');
    expect(prisma?.content).toContain('age Float?');
    expect(prisma?.content).toContain('@@map("students")');
    expect(prisma?.content).toContain('provider = "postgresql"');
  });

  it('chọn provider theo meta.database', () => {
    const mysql = {
      ...schoolAdminSample,
      meta: { ...schoolAdminSample.meta, database: 'mysql' },
    };
    const files = generate(mysql);
    expect(
      files.find((f) => f.path === 'backend/prisma/schema.prisma')?.content,
    ).toContain('provider = "mysql"');
    expect(
      files.find((f) => f.path === 'docker-compose.yml')?.content,
    ).toContain('image: mysql:8');
  });

  it('báo lỗi validate kèm đường dẫn', () => {
    const invalid = {
      ...schoolAdminSample,
      entities: [{ name: '1bad', fields: [] }],
    };
    try {
      generate(invalid);
      throw new Error('phải ném lỗi');
    } catch (err) {
      expect(err).toBeInstanceOf(SchemaValidationError);
      expect((err as SchemaValidationError).issues[0].path).toBe(
        'entities.0.name',
      );
    }
  });

  it('project rỗng không sinh file theo entity', () => {
    const paths = generate(createEmptyProject('empty')).map((f) => f.path);
    expect(paths).not.toContain(
      'backend/src/modules/student/student.routes.ts',
    );
    expect(paths).toContain('docker-compose.yml');
  });

  describe('quy ước thư mục templates', () => {
    let dir: string;
    beforeEach(() => {
      dir = mkdtempSync(join(tmpdir(), 'cf-tpl-'));
    });
    afterEach(() => rmSync(dir, { recursive: true, force: true }));

    const write = (rel: string, content: string) => {
      const full = join(dir, rel);
      mkdirSync(join(full, '..'), { recursive: true });
      writeFileSync(full, content);
    };

    it('.hbs có biến, file khác copy nguyên, __entity__ và __page__ lặp, file rỗng bị bỏ', () => {
      write('root/readme.md.hbs', '# {{project.name}}');
      write('frontend/raw/{{keep}}.txt', 'giữ {{nguyên}}');
      write('frontend/src/api/__entity__.api.ts.hbs', '{{entity.pluralKebab}}');
      write('frontend/src/pages/__page__.tsx.hbs', '{{page.route}}');
      write(
        'frontend/src/register.tsx.hbs',
        '{{#if auth.allowSelfRegister}}x{{/if}}\n',
      );

      const files = generate(schoolAdminSample, dir);
      expect(files).toEqual([
        { path: 'frontend/raw/{{keep}}.txt', content: 'giữ {{nguyên}}' },
        { path: 'frontend/src/api/student.api.ts', content: 'students' },
        { path: 'frontend/src/pages/StudentsPage.tsx', content: '/students' },
        { path: 'readme.md', content: '# school-admin' },
      ]);
    });
  });
});

describe('normalize / buildContext', () => {
  it('nameForms cho tên ghép', () => {
    expect(nameForms('OrderItem')).toEqual({
      pascal: 'OrderItem',
      camel: 'orderItem',
      kebab: 'order-item',
      plural: 'orderItems',
      pluralKebab: 'order-items',
    });
  });

  it('thêm admin và user vào roles', () => {
    const { schema } = normalize({ ...schoolAdminSample, roles: ['staff'] });
    expect(schema.roles).toEqual(['admin', 'user', 'staff']);
  });

  it('buildContext trả đúng TemplateContext', () => {
    const ctx = buildContext(normalize(schoolAdminSample));
    expect(ctx.project).toEqual({
      name: 'school-admin',
      kebabName: 'school-admin',
      version: 1,
    });
    expect(ctx.db).toEqual({ id: 'postgres' });
    expect(ctx.entities[0]).toMatchObject({
      name: 'Student',
      pascal: 'Student',
      plural: 'students',
      pluralKebab: 'students',
      ownerOnly: false,
      permissions: { admin: 'CRUD', user: 'R' },
    });
    expect(ctx.entities[0].fields[1]).toEqual({
      name: 'email',
      type: 'string',
      required: false,
      unique: true,
      options: [],
    });
    expect(ctx.pages[0]).toMatchObject({
      id: 'p1',
      route: '/students',
      componentName: 'StudentsPage',
    });
  });
});
