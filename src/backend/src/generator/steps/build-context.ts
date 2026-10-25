import type { PageContext, TemplateContext } from '@codeflow/schema';
import { kebabCase, pascalCase } from '../helpers/case';
import type { NormalizedProject } from './normalize';

function pageComponentName(route: string, id: string): string {
  const base = pascalCase(route) || pascalCase(id);
  return `${base}Page`;
}

export function buildContext({
  schema,
  names,
}: NormalizedProject): TemplateContext {
  const pages: PageContext[] = schema.pages.map((page) => ({
    id: page.id,
    route: page.route,
    title: page.title,
    componentName: pageComponentName(page.route, page.id),
    requireRole: page.requireRole,
  }));

  return {
    project: {
      name: schema.meta.name,
      kebabName: kebabCase(schema.meta.name),
      version: schema.meta.version,
    },
    db: { id: schema.meta.database },
    auth: { allowSelfRegister: schema.auth.allowSelfRegister },
    roles: schema.roles,
    entities: schema.entities.map((entity) => ({
      ...names[entity.name],
      name: entity.name,
      ownerOnly: entity.ownerOnly,
      fields: entity.fields.map((field) => ({
        name: field.name,
        type: field.type,
        required: field.required ?? false,
        unique: field.unique ?? false,
        options: field.options ?? [],
        ...(field.default !== undefined ? { default: field.default } : {}),
      })),
      permissions: schema.permissions[entity.name] ?? {},
    })),
    pages,
    schema,
  };
}
