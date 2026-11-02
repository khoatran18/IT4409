import { camelCase, kebabCase, pascalCase, plural } from './case';
import { dotenv, json, prismaDefault, prismaField, zodExpr } from './field';

export const helpers = {
  pascalCase,
  camelCase,
  kebabCase,
  plural,
  eq: (a: unknown, b: unknown) => a === b,
  /** `${NAME:-fallback}`; viết thẳng trong .hbs sẽ dính `}}}` của Handlebars */
  shellVar: (name: string, fallback: string) => `\${${name}:-${fallback}}`,
  json,
  dotenv,
  zodExpr,
  prismaDefault,
};

export { prismaField };
export { camelCase, kebabCase, pascalCase, plural };
