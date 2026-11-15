import type { ProjectSchema, TemplateContext } from '@codeflow/schema';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import Handlebars from 'handlebars';
import { helpers } from '../../../generator/helpers';

export const root = join(__dirname, '..');

// exports của @codeflow/schema trỏ tới dist/index.cjs (không tồn tại) nên đọc thẳng dist/index.js.
const { schoolAdminSample } = require(join(__dirname, '../../../../../schema/dist/index.js')) as {
  schoolAdminSample: ProjectSchema;
};

export function listTemplates(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (name === '__tests__') return [];
    if (statSync(path).isDirectory()) return listTemplates(path);
    return path.endsWith('.hbs') ? [path] : [];
  });
}

export function buildContext(): TemplateContext {
  return {
    project: { name: 'school-admin', kebabName: 'school-admin', version: 1 },
    db: { id: 'postgres' },
    auth: { allowSelfRegister: false },
    roles: ['admin', 'user'],
    entities: [
      {
        name: 'Student',
        pascal: 'Student',
        camel: 'student',
        kebab: 'student',
        plural: 'students',
        pluralKebab: 'students',
        ownerOnly: false,
        displayField: 'name',
        fields: [
          { name: 'name', type: 'string', required: true, unique: false, options: [] },
          { name: 'grade', type: 'enum', required: false, unique: false, options: ['A', 'B "quoted"'] },
        ],
        permissions: { admin: 'CRUD', user: 'R' },
      },
    ],
    pages: [
      { id: 'p1', route: '/students', title: 'Sinh viên', componentName: 'StudentsPage', requireRole: ['admin', 'user'] },
      { id: 'p2', route: '/about', title: 'Giới thiệu "App" & more', componentName: 'AboutPage', requireRole: [] },
    ],
    schema: schoolAdminSample,
  };
}

// Quy tắc của generator: .html/.tsx/.jsx render có escape HTML, các đuôi khác không escape.
function escapes(file: string): boolean {
  return /\.(html|tsx|jsx)\.hbs$/.test(file);
}

export function render(file: string, context: TemplateContext): string {
  const data = file.includes('__entity__')
    ? { ...context, entity: context.entities[0] }
    : file.includes('__page__')
      ? { ...context, page: context.pages[0] }
      : context;
  const hbs = Handlebars.create();
  for (const [name, fn] of Object.entries(helpers)) hbs.registerHelper(name, fn);
  return hbs.compile(readFileSync(file, 'utf8'), { strict: false, noEscape: !escapes(file) })(data);
}

/**
 * Còn sót cú pháp Handlebars chưa render. Trang kéo thả hợp lệ chứa `props={{ ... }}` (object literal trong JSX),
 * nên không thể cấm `{{` nói chung: chỉ bắt `{{#`, `{{{`, `{{ten}}` và `{{helper tham-số}}`.
 */
export function hasUnrenderedHandlebars(content: string): boolean {
  return /\{\{\{|\{\{[#/>!^&]|\{\{\s*[\w@.]+[^:{}]*\}\}/.test(content);
}
