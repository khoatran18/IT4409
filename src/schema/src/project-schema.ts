import { z } from 'zod';

export const DATABASES = ['postgres', 'mysql'] as const;
export const FIELD_TYPES = ['string', 'text', 'number', 'boolean', 'date', 'enum'] as const;

const identifier = z.string().regex(/^[A-Za-z][A-Za-z0-9_]*$/, 'Chỉ gồm chữ, số, dấu gạch dưới; bắt đầu bằng chữ');

export const fieldSchema = z.object({
  name: identifier,
  type: z.enum(FIELD_TYPES),
  required: z.boolean().optional(),
  unique: z.boolean().optional(),
  default: z.union([z.string(), z.number(), z.boolean()]).optional(),
  options: z.array(z.string()).optional(),
});

export const entitySchema = z.object({
  name: identifier,
  ownerOnly: z.boolean().default(false),
  fields: z.array(fieldSchema),
});

// "CRUD" hoặc tập con theo đúng thứ tự, ví dụ "R", "CR", "CRUD"
const permissionString = z.string().regex(/^C?R?U?D?$/, 'Chỉ gồm các ký tự C, R, U, D theo thứ tự');

export interface ComponentNode {
  id: string;
  type: string;
  props: Record<string, unknown>;
  events?: Record<string, string>;
  children?: ComponentNode[];
}

export const componentSchema: z.ZodType<ComponentNode> = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    type: z.string().min(1),
    props: z.record(z.string(), z.unknown()).default({}),
    events: z.record(z.string(), z.string()).optional(),
    children: z.array(componentSchema).optional(),
  }),
) as z.ZodType<ComponentNode>;

export const pageSchema = z.object({
  id: z.string().min(1),
  route: z.string().startsWith('/'),
  title: z.string().min(1),
  requireRole: z.array(z.string()).default([]),
  components: z.array(componentSchema).default([]),
});

export const WORKFLOW_NODE_TYPES = ['callApi', 'condition', 'navigate', 'showMessage'] as const;

export const workflowNodeSchema = z.object({
  id: z.string().min(1),
  type: z.enum(WORKFLOW_NODE_TYPES),
  config: z.record(z.string(), z.unknown()).default({}),
});

export const workflowEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  // nhánh của node condition
  branch: z.enum(['true', 'false']).optional(),
});

export const workflowSchema = z.object({
  id: z.string().min(1),
  nodes: z.array(workflowNodeSchema),
  edges: z.array(workflowEdgeSchema).default([]),
});

export const projectSchema = z.object({
  meta: z.object({
    name: z.string().min(1),
    version: z.number().int().default(1),
    database: z.enum(DATABASES).default('postgres'),
  }),
  entities: z.array(entitySchema).default([]),
  // luôn chứa admin và user
  roles: z.array(z.string()).default(['admin', 'user']),
  auth: z.object({ allowSelfRegister: z.boolean().default(false) }).default({ allowSelfRegister: false }),
  // permissions[entity][role] = "CRUD" | ...
  permissions: z.record(z.string(), z.record(z.string(), permissionString)).default({}),
  pages: z.array(pageSchema).default([]),
  workflows: z.array(workflowSchema).default([]),
});

export type Database = (typeof DATABASES)[number];
export type FieldType = (typeof FIELD_TYPES)[number];
export type Field = z.infer<typeof fieldSchema>;
export type Entity = z.infer<typeof entitySchema>;
export type Page = z.infer<typeof pageSchema>;
export type WorkflowNode = z.infer<typeof workflowNodeSchema>;
export type WorkflowEdge = z.infer<typeof workflowEdgeSchema>;
export type Workflow = z.infer<typeof workflowSchema>;
export type ProjectSchema = z.infer<typeof projectSchema>;

export function createEmptyProject(name: string): ProjectSchema {
  return projectSchema.parse({ meta: { name } });
}
