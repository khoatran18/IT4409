import type { NameForms, ProjectSchema } from '@codeflow/schema';
import { camelCase, kebabCase, pascalCase, plural } from '../helpers/case';

export interface NormalizedProject {
  schema: ProjectSchema;
  /** Tên các dạng của từng entity, khóa theo tên entity gốc */
  names: Record<string, NameForms>;
}

export function nameForms(name: string): NameForms {
  return {
    pascal: pascalCase(name),
    camel: camelCase(name),
    kebab: kebabCase(name),
    plural: camelCase(plural(name)),
    pluralKebab: kebabCase(plural(name)),
  };
}

export function normalize(schema: ProjectSchema): NormalizedProject {
  const roles = [...new Set(['admin', 'user', ...schema.roles])];
  const names = Object.fromEntries(
    schema.entities.map((entity) => [entity.name, nameForms(entity.name)]),
  );
  return { schema: { ...schema, roles }, names };
}
