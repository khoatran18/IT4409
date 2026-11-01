import type { ProjectSchema, TemplateContext } from '@codeflow/schema';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import Handlebars from 'handlebars';

const root = join(__dirname, '..');

// exports của @codeflow/schema trỏ tới dist/index.cjs (không tồn tại) nên đọc thẳng dist/index.js.
const { schoolAdminSample } = require(join(__dirname, '../../../../../schema/dist/index.js')) as {
  schoolAdminSample: ProjectSchema;
};

function listTemplates(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (name === '__tests__') return [];
    if (statSync(path).isDirectory()) return listTemplates(path);
    return path.endsWith('.hbs') ? [path] : [];
  });
}

function buildContext(): TemplateContext {
  return {
    project: { name: 'school-admin', kebabName: 'school-admin', version: 1 },
    db: { id: 'postgres' },
    auth: { allowSelfRegister: false },
    roles: ['admin', 'user'],
    entities: [],
    pages: [
      { id: 'p1', route: '/students', title: 'Sinh viên', componentName: 'StudentsPage', requireRole: ['admin', 'user'] },
      { id: 'p2', route: '/about', title: 'Giới thiệu "App" & more', componentName: 'AboutPage', requireRole: [] },
    ],
    schema: schoolAdminSample,
  };
}

function render(file: string, context: TemplateContext): string {
  const hbs = Handlebars.create();
  hbs.registerHelper('eq', (a: unknown, b: unknown) => a === b);
  return hbs.compile(readFileSync(file, 'utf8'), { strict: false })(context);
}

describe('template FE khung dự án', () => {
  const files = listTemplates(root);

  it('có đủ các template khung', () => {
    const names = files.map((f) => relative(root, f)).sort();
    expect(names).toEqual(
      [
        'Dockerfile.hbs',
        'index.html.hbs',
        'nginx.conf.hbs',
        'package.json.hbs',
        'src/App.tsx.hbs',
        'src/pages/PagePlaceholder.tsx.hbs',
        'src/main.tsx.hbs',
        'tsconfig.json.hbs',
        'vite.config.ts.hbs',
      ].sort(),
    );
  });

  it.each(listTemplates(root).map((f) => [relative(root, f), f]))('%s render xong không còn {{', (_name, file) => {
    expect(render(file, buildContext())).not.toContain('{{');
  });

  it('package.json hợp lệ', () => {
    const json = JSON.parse(render(join(root, 'package.json.hbs'), buildContext()));
    expect(json.name).toBe('school-admin-frontend');
    expect(json.dependencies).toHaveProperty('react-router-dom');
  });

  it('tsconfig.json hợp lệ', () => {
    expect(() => JSON.parse(render(join(root, 'tsconfig.json.hbs'), buildContext()))).not.toThrow();
  });

  it('App.tsx có route cho mỗi page, redirect "/" về trang đầu và route 404', () => {
    const app = render(join(root, 'src/App.tsx.hbs'), buildContext());
    expect(app).toContain('<Route path="/students" element={<StudentsPage />} />');
    expect(app).toContain('<Route path="/about" element={<AboutPage />} />');
    expect(app).toContain('<Navigate to="/students" replace />');
    expect(app).toContain('path="*"');
    expect(app).toContain('title="Giới thiệu &quot;App&quot; &amp; more"');
  });

  it('không redirect khi trang đầu đã là "/"', () => {
    const context = buildContext();
    context.pages[0].route = '/';
    expect(render(join(root, 'src/App.tsx.hbs'), context)).not.toContain('<Navigate');
  });

  it('không có page nào vẫn render được', () => {
    const context = buildContext();
    context.pages = [];
    const app = render(join(root, 'src/App.tsx.hbs'), context);
    expect(app).not.toContain('<Navigate');
    expect(app).not.toContain('{{');
  });
});
