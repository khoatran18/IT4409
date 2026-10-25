import type { FieldType } from '@codeflow/schema';
import { camelCase, kebabCase, pascalCase, plural } from './case';

const PRISMA_TYPES: Record<FieldType, string> = {
  string: 'String',
  text: 'String',
  number: 'Float',
  boolean: 'Boolean',
  date: 'DateTime',
  enum: 'String',
};

export const helpers = {
  pascalCase,
  camelCase,
  kebabCase,
  plural,
  eq: (a: unknown, b: unknown) => a === b,
  /** `${NAME:-fallback}`; viết thẳng trong .hbs sẽ dính `}}}` của Handlebars */
  shellVar: (name: string, fallback: string) => `\${${name}:-${fallback}}`,
  prismaType: (type: FieldType) => PRISMA_TYPES[type],
};

export { camelCase, kebabCase, pascalCase, plural };
