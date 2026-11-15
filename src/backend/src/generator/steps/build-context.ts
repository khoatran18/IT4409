import type { PageContext, ProjectSchema, TemplateContext } from '@codeflow/schema';
import { kebabCase, pascalCase } from '../helpers/case';
import type { NormalizedProject } from './normalize';

function pageComponentName(route: string, id: string): string {
  const base = pascalCase(route) || pascalCase(id);
  return `${base}Page`;
}

function displayFieldOf(entity: ProjectSchema['entities'][number]): string {
  return (
    entity.displayField ??
    entity.fields.find((field) => field.type === 'string')?.name ??
    'id'
  );
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

  const entityByName = new Map(schema.entities.map((entity) => [entity.name, entity]));
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
      displayField: displayFieldOf(entity),
      fields: entity.fields.map((field) => {
        const target = field.entity ? entityByName.get(field.entity) : undefined;
        return {
          name: field.name,
          type: field.type,
          required: field.required ?? false,
          unique: field.unique ?? false,
          options: field.options ?? [],
          ...(field.default !== undefined ? { default: field.default } : {}),
          ...(field.type === 'ref' && target
            ? {
                ref: {
                  ...names[target.name],
                  name: target.name,
                  displayField: displayFieldOf(target),
                  idName: field.name + 'Id',
                },
              }
            : {}),
        };
      }),
      permissions: schema.permissions[entity.name] ?? {},
    })),
    pages,
    schema,
  };
}
