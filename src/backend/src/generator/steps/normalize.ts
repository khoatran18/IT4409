import type { ComponentNode, NameForms, ProjectSchema } from '@codeflow/schema';
import { COMPONENT_REGISTRY } from '../../schema-validator/component-registry';
import { camelCase, kebabCase, pascalCase, plural } from '../helpers/case';

export interface NormalizedProject {
  schema: ProjectSchema;
  /** Tên các dạng của từng entity, khóa theo tên entity gốc */
  names: Record<string, NameForms>;
}

export const DEFAULT_PERMISSIONS: Record<string, string> = {
  admin: 'CRUD',
  user: 'R',
};

export function nameForms(name: string): NameForms {
  return {
    pascal: pascalCase(name),
    camel: camelCase(name),
    kebab: kebabCase(name),
    plural: camelCase(plural(name)),
    pluralKebab: kebabCase(plural(name)),
  };
}

function withDefaultProps(node: ComponentNode): ComponentNode {
  const defaults = COMPONENT_REGISTRY[node.type]?.defaults ?? {};
  return {
    ...node,
    props: { ...structuredClone(defaults), ...node.props },
    ...(node.children ? { children: node.children.map(withDefaultProps) } : {}),
  };
}

/** Entity chưa khai báo quyền nhận mặc định; entity đã khai báo luôn để admin có đủ CRUD. */
function withDefaultPermissions(
  schema: ProjectSchema,
): ProjectSchema['permissions'] {
  return Object.fromEntries(
    schema.entities.map(({ name }) => {
      const declared = schema.permissions[name];
      return [
        name,
        declared ? { admin: 'CRUD', ...declared } : { ...DEFAULT_PERMISSIONS },
      ];
    }),
  );
}

export function normalize(schema: ProjectSchema): NormalizedProject {
  const roles = [...new Set(['admin', 'user', ...schema.roles])];
  const names = Object.fromEntries(
    schema.entities.map((entity) => [entity.name, nameForms(entity.name)]),
  );
  return {
    schema: {
      ...schema,
      roles,
      permissions: withDefaultPermissions(schema),
      pages: schema.pages.map((page) => ({
        ...page,
        components: page.components.map(withDefaultProps),
      })),
    },
    names,
  };
}
