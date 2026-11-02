import type {
  PageContext,
  ProjectSchema,
  TemplateContext,
} from '@codeflow/schema';
import { dbProfiles, type DbEnv } from '../db-profiles';
import { kebabCase, pascalCase } from '../helpers/case';
import type { DeployContext, DeployOptions } from '../types';
import type { NormalizedProject } from './normalize';

export type RenderContext = TemplateContext & { deploy: DeployContext };

function pageComponentName(route: string, id: string): string {
  const base = pascalCase(route) || pascalCase(id);
  return `${base}Page`;
}

function buildDeploy(
  database: ProjectSchema['meta']['database'],
  projectName: string,
  options: DeployOptions,
): DeployContext {
  const profile = dbProfiles[database];
  const composeEnv: DbEnv = {
    host: 'db',
    port: String(profile.defaultPort),
    name: `\${DB_NAME:-${projectName}}`,
    user: '${DB_USER:-app}',
    password: '${DB_PASSWORD}',
  };
  const localEnv: DbEnv = {
    host: 'localhost',
    port: String(profile.defaultPort),
    name: projectName,
    user: 'app',
    password: 'app',
  };
  return {
    ...options,
    db: {
      id: profile.id,
      prismaProvider: profile.prismaProvider,
      image: profile.image,
      port: profile.defaultPort,
      service: profile.composeService({
        ...composeEnv,
        password: '${DB_PASSWORD:?đặt DB_PASSWORD trong .env}',
      }),
      composeUrl: profile.databaseUrl(composeEnv),
      localUrl: profile.databaseUrl(localEnv),
      env: Object.entries(profile.envDefaults).map(([key, value]) => ({
        key,
        value,
      })),
    },
  };
}

export function buildContext(
  { schema, names }: NormalizedProject,
  deploy: DeployOptions,
): RenderContext {
  const pages: PageContext[] = schema.pages.map((page) => ({
    id: page.id,
    route: page.route,
    title: page.title,
    componentName: pageComponentName(page.route, page.id),
    requireRole: page.requireRole,
  }));

  const kebabName = kebabCase(schema.meta.name) || 'app';

  return {
    project: {
      name: schema.meta.name,
      kebabName,
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
    deploy: buildDeploy(schema.meta.database, kebabName, deploy),
  };
}
