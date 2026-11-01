import {
  projectSchema,
  type ComponentNode,
  type Entity,
  type Field,
  type ProjectSchema,
} from '@codeflow/schema';
import { kebabCase } from '../generator/helpers/case';
import {
  COMPONENT_REGISTRY,
  RESERVED_ENTITY_NAMES,
  RESERVED_FIELD_NAMES,
  SYSTEM_FIELDS,
} from './component-registry';

export type IssueCode = 'REQUIRED' | 'UNKNOWN_REF' | 'DUPLICATE' | 'INVALID';

export interface SchemaIssue {
  path: string;
  code: IssueCode;
  message: string;
}

export interface ValidationReport {
  valid: boolean;
  errors: SchemaIssue[];
  warnings: SchemaIssue[];
}

/** Ghép đường dẫn dạng `pages[0].components[1].props.entity` */
export function joinPath(segments: ReadonlyArray<PropertyKey>): string {
  return segments.reduce<string>((acc, seg) => {
    if (typeof seg === 'number') return `${acc}[${seg}]`;
    const key = String(seg);
    return acc ? `${acc}.${key}` : key;
  }, '');
}

const ROLE_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*$/;

class Collector {
  readonly errors: SchemaIssue[] = [];
  readonly warnings: SchemaIssue[] = [];

  error(path: string, code: IssueCode, message: string) {
    this.errors.push({ path, code, message });
  }

  warn(path: string, code: IssueCode, message: string) {
    this.warnings.push({ path, code, message });
  }
}

/** Kiểm tra cấu trúc bằng Zod; lỗi trả về cùng dạng với kiểm tra nghiệp vụ. */
export function parseProject(
  input: unknown,
): { schema: ProjectSchema } | { errors: SchemaIssue[] } {
  const result = projectSchema.safeParse(input);
  if (result.success) return { schema: result.data };
  return {
    errors: result.error.issues.map((issue) => ({
      path: joinPath(issue.path),
      code: issue.code === 'invalid_type' ? 'REQUIRED' : 'INVALID',
      message: issue.message,
    })),
  };
}

/** Kiểm tra nghiệp vụ trên schema đã qua Zod. */
export function checkProject(schema: ProjectSchema): ValidationReport {
  const out = new Collector();

  if (!kebabCase(schema.meta.name)) {
    out.error(
      'meta.name',
      'INVALID',
      'Tên project cần có ít nhất một chữ hoặc số',
    );
  }

  const roles = new Set(['admin', 'user', ...schema.roles]);
  checkRoles(schema, out);
  checkEntities(schema.entities, out);
  checkPermissions(schema, roles, out);
  checkPages(schema, roles, out);
  checkWorkflows(schema, out);

  return {
    valid: out.errors.length === 0,
    errors: out.errors,
    warnings: out.warnings,
  };
}

function checkRoles(schema: ProjectSchema, out: Collector) {
  const seen = new Set<string>();
  schema.roles.forEach((role, i) => {
    const path = `roles[${i}]`;
    if (!ROLE_PATTERN.test(role)) {
      out.error(
        path,
        'INVALID',
        `Tên role "${role}" chỉ gồm chữ, số, '_' hoặc '-'`,
      );
    }
    if (seen.has(role)) out.error(path, 'DUPLICATE', `Role "${role}" bị trùng`);
    seen.add(role);
  });
}

function checkEntities(entities: Entity[], out: Collector) {
  const seen = new Map<string, string>();
  entities.forEach((entity, i) => {
    const base = `entities[${i}]`;
    const key = kebabCase(entity.name);
    if (seen.has(key)) {
      out.error(
        `${base}.name`,
        'DUPLICATE',
        `Entity "${entity.name}" trùng với "${seen.get(key)}"`,
      );
    }
    seen.set(key, entity.name);
    if ((RESERVED_ENTITY_NAMES as readonly string[]).includes(entity.name)) {
      out.error(
        `${base}.name`,
        'INVALID',
        `Tên entity "${entity.name}" đã dành riêng cho hệ thống`,
      );
    }
    if (entity.fields.length === 0) {
      out.warn(
        `${base}.fields`,
        'REQUIRED',
        `Entity "${entity.name}" chưa có field nào`,
      );
    }
    entity.fields.forEach((field, j) =>
      checkField(field, `${base}.fields[${j}]`, out),
    );
    const names = new Map<string, number>();
    entity.fields.forEach((field, j) => {
      const lower = field.name.toLowerCase();
      if (names.has(lower)) {
        out.error(
          `${base}.fields[${j}].name`,
          'DUPLICATE',
          `Field "${field.name}" bị trùng trong ${entity.name}`,
        );
      }
      names.set(lower, j);
    });
  });
}

function checkField(field: Field, path: string, out: Collector) {
  if ((RESERVED_FIELD_NAMES as readonly string[]).includes(field.name)) {
    out.error(
      `${path}.name`,
      'INVALID',
      `Field "${field.name}" do hệ thống quản lý, hãy đổi tên`,
    );
  }

  if (field.type === 'enum') {
    const options = field.options ?? [];
    if (options.length === 0) {
      out.error(
        `${path}.options`,
        'REQUIRED',
        `Field enum "${field.name}" cần ít nhất một lựa chọn`,
      );
    }
    options.forEach((option, k) => {
      if (option.trim() === '') {
        out.error(
          `${path}.options[${k}]`,
          'INVALID',
          'Lựa chọn không được để trống',
        );
      } else if (options.indexOf(option) !== k) {
        out.error(
          `${path}.options[${k}]`,
          'DUPLICATE',
          `Lựa chọn "${option}" bị trùng`,
        );
      }
    });
    if (typeof field.default === 'string' && !options.includes(field.default)) {
      out.error(
        `${path}.default`,
        'INVALID',
        `Giá trị mặc định "${field.default}" không nằm trong options`,
      );
    }
  } else if (field.options?.length) {
    out.warn(
      `${path}.options`,
      'INVALID',
      `Field ${field.type} không dùng options`,
    );
  }

  if (field.default !== undefined && field.type !== 'enum') {
    const expected =
      field.type === 'number' || field.type === 'boolean'
        ? field.type
        : 'string';
    if (typeof field.default !== expected) {
      out.error(
        `${path}.default`,
        'INVALID',
        `Giá trị mặc định của field ${field.type} phải là ${expected}`,
      );
    }
  }
}

function checkPermissions(
  schema: ProjectSchema,
  roles: Set<string>,
  out: Collector,
) {
  const entityNames = new Set(schema.entities.map((e) => e.name));
  for (const [entity, byRole] of Object.entries(schema.permissions)) {
    if (!entityNames.has(entity)) {
      out.error(
        `permissions.${entity}`,
        'UNKNOWN_REF',
        `Entity "${entity}" không tồn tại`,
      );
      continue;
    }
    for (const role of Object.keys(byRole)) {
      if (!roles.has(role)) {
        out.error(
          `permissions.${entity}.${role}`,
          'UNKNOWN_REF',
          `Role "${role}" không tồn tại`,
        );
      }
    }
  }
}

function checkPages(schema: ProjectSchema, roles: Set<string>, out: Collector) {
  const entities = new Map(schema.entities.map((e) => [e.name, e]));
  const workflowIds = new Set(schema.workflows.map((w) => w.id));
  const pageIds = new Set<string>();
  const routes = new Set<string>();
  const componentIds = new Set<string>();

  schema.pages.forEach((page, i) => {
    const base = `pages[${i}]`;
    if (pageIds.has(page.id))
      out.error(`${base}.id`, 'DUPLICATE', `Page id "${page.id}" bị trùng`);
    pageIds.add(page.id);
    if (routes.has(page.route))
      out.error(`${base}.route`, 'DUPLICATE', `Route "${page.route}" bị trùng`);
    routes.add(page.route);
    page.requireRole.forEach((role, k) => {
      if (!roles.has(role)) {
        out.error(
          `${base}.requireRole[${k}]`,
          'UNKNOWN_REF',
          `Role "${role}" không tồn tại`,
        );
      }
    });
    if (page.components.length === 0) {
      out.warn(
        `${base}.components`,
        'REQUIRED',
        `Trang "${page.title}" chưa có component nào`,
      );
    }
    const ctx: ComponentContext = { entities, workflowIds, componentIds, out };
    page.components.forEach((node, k) =>
      checkComponent(node, `${base}.components[${k}]`, ctx),
    );
  });
}

interface ComponentContext {
  entities: Map<string, Entity>;
  workflowIds: Set<string>;
  componentIds: Set<string>;
  out: Collector;
}

function isBlank(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function checkComponent(
  node: ComponentNode,
  path: string,
  ctx: ComponentContext,
) {
  const { out } = ctx;
  if (ctx.componentIds.has(node.id)) {
    out.error(`${path}.id`, 'DUPLICATE', `Component id "${node.id}" bị trùng`);
  }
  ctx.componentIds.add(node.id);

  const rule = COMPONENT_REGISTRY[node.type];
  if (!rule) {
    out.error(
      `${path}.type`,
      'UNKNOWN_REF',
      `Component "${node.type}" không có trong registry`,
    );
  } else {
    for (const prop of rule.required ?? []) {
      if (isBlank(node.props[prop])) {
        out.error(
          `${path}.props.${prop}`,
          'REQUIRED',
          `Chưa cấu hình ${prop} cho ${node.type}`,
        );
      }
    }
    if (rule.oneOf && rule.oneOf.every((prop) => isBlank(node.props[prop]))) {
      out.error(
        `${path}.props.${rule.oneOf[0]}`,
        'REQUIRED',
        `${node.type} cần một trong: ${rule.oneOf.join(', ')}`,
      );
    }
    for (const prop of rule.entityProps ?? []) {
      const value = node.props[prop];
      if (isBlank(value)) continue;
      if (typeof value !== 'string' || !ctx.entities.has(value)) {
        out.error(
          `${path}.props.${prop}`,
          'UNKNOWN_REF',
          `Entity "${String(value)}" không tồn tại`,
        );
      }
    }
    if (node.type === 'Table') checkColumns(node, path, ctx);
  }

  for (const [event, workflowId] of Object.entries(node.events ?? {})) {
    if (!ctx.workflowIds.has(workflowId)) {
      out.error(
        `${path}.events.${event}`,
        'UNKNOWN_REF',
        `Workflow "${workflowId}" không tồn tại`,
      );
    }
  }
  node.children?.forEach((child, i) =>
    checkComponent(child, `${path}.children[${i}]`, ctx),
  );
}

function checkColumns(
  node: ComponentNode,
  path: string,
  ctx: ComponentContext,
) {
  const entityName = node.props.entity;
  const columns = node.props.columns;
  if (typeof entityName !== 'string' || !Array.isArray(columns)) return;
  const entity = ctx.entities.get(entityName);
  if (!entity) return;
  const known = new Set<string>([
    ...SYSTEM_FIELDS,
    ...entity.fields.map((f) => f.name),
  ]);
  columns.forEach((column, i) => {
    if (typeof column !== 'string' || !known.has(column)) {
      ctx.out.error(
        `${path}.props.columns[${i}]`,
        'UNKNOWN_REF',
        `Field "${String(column)}" không có trong ${entityName}`,
      );
    }
  });
}

function checkWorkflows(schema: ProjectSchema, out: Collector) {
  const ids = new Set<string>();
  schema.workflows.forEach((workflow, i) => {
    const base = `workflows[${i}]`;
    if (ids.has(workflow.id))
      out.error(
        `${base}.id`,
        'DUPLICATE',
        `Workflow id "${workflow.id}" bị trùng`,
      );
    ids.add(workflow.id);

    const nodeIds = new Set<string>();
    workflow.nodes.forEach((node, k) => {
      if (nodeIds.has(node.id))
        out.error(
          `${base}.nodes[${k}].id`,
          'DUPLICATE',
          `Node id "${node.id}" bị trùng`,
        );
      nodeIds.add(node.id);
    });
    workflow.edges.forEach((edge, k) => {
      for (const end of ['from', 'to'] as const) {
        if (!nodeIds.has(edge[end])) {
          out.error(
            `${base}.edges[${k}].${end}`,
            'UNKNOWN_REF',
            `Node "${edge[end]}" không tồn tại`,
          );
        }
      }
    });
  });
}

/** Zod rồi kiểm tra nghiệp vụ; dùng cho `/validate` và bước validate của pipeline. */
export function validateProject(
  input: unknown,
): ValidationReport & { schema?: ProjectSchema } {
  const parsed = parseProject(input);
  if ('errors' in parsed)
    return { valid: false, errors: parsed.errors, warnings: [] };
  return { ...checkProject(parsed.schema), schema: parsed.schema };
}
