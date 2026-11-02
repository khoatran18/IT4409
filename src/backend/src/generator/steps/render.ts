import type { FieldContext } from '@codeflow/schema';
import Handlebars from 'handlebars';
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { dbProfiles } from '../db-profiles';
import { helpers, prismaField } from '../helpers';
import type { GeneratedFile } from '../types';
import type { RenderContext } from './build-context';

export const TEMPLATES_DIR = join(__dirname, '..', '..', 'templates');

/**
 * File markup (HTML/JSX) tự escape `{{x}}` bằng entity, hợp lệ cho cả nội dung lẫn thuộc tính.
 * File còn lại (ts, json, prisma, yml...) không escape vì entity sẽ phá cú pháp; giá trị người dùng nhập
 * (title, option, default) phải đi qua helper `json`, còn tên entity/field đã bị Zod giới hạn ở dạng identifier.
 */
const ESCAPED_EXTENSIONS = new Set(['.html', '.tsx', '.jsx']);

const ENTITY_TOKEN = '__entity__';
const PAGE_TOKEN = '__page__';

function listFiles(dir: string, prefix = ''): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.name !== '__tests__')
    .sort((a, b) => (a.name < b.name ? -1 : 1))
    .flatMap((entry) => {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      return entry.isDirectory()
        ? listFiles(join(dir, entry.name), rel)
        : [rel];
    });
}

/** Đường dẫn đầu ra: bỏ `root/` ở đầu, bỏ đuôi `.hbs`. */
function outputPath(templatePath: string): string {
  return templatePath.replace(/^root\//, '').replace(/\.hbs$/, '');
}

/**
 * Mỗi template cho ra một hoặc nhiều file: `__entity__` lặp theo entity, `__page__` lặp theo page.
 * File `.hbs` render ra nội dung rỗng (chỉ khoảng trắng) thì bị bỏ qua, để template tự tắt theo điều kiện.
 */
export function render(
  context: RenderContext,
  templatesDir: string = TEMPLATES_DIR,
): GeneratedFile[] {
  const hbs = Handlebars.create();
  for (const [name, fn] of Object.entries(helpers))
    hbs.registerHelper(name, fn);
  const { typeMap } = dbProfiles[context.db.id];
  hbs.registerHelper('prismaField', (field: FieldContext) =>
    prismaField(typeMap, field),
  );

  const files: GeneratedFile[] = [];

  for (const templatePath of listFiles(templatesDir)) {
    const source = readFileSync(join(templatesDir, templatePath), 'utf8');
    const isTemplate = templatePath.endsWith('.hbs');
    const target = outputPath(templatePath);
    const compiled = isTemplate
      ? hbs.compile(source, {
          noEscape: !ESCAPED_EXTENSIONS.has(extname(target)),
        })
      : undefined;

    const emit = (path: string, data: Record<string, unknown>) => {
      const content = compiled ? compiled(data) : source;
      if (compiled && content.trim() === '') return;
      files.push({ path, content });
    };

    if (target.includes(ENTITY_TOKEN)) {
      for (const entity of context.entities) {
        emit(target.replaceAll(ENTITY_TOKEN, entity.kebab), {
          ...context,
          entity,
        });
      }
    } else if (target.includes(PAGE_TOKEN)) {
      for (const page of context.pages) {
        emit(target.replaceAll(PAGE_TOKEN, page.componentName), {
          ...context,
          page,
        });
      }
    } else {
      emit(target, { ...context });
    }
  }

  return files;
}
