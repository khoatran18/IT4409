import type { Database, FieldType, ProjectSchema } from './project-schema';

/**
 * Hợp đồng giữa generator (A) và template (A viết BE, B viết FE).
 * Template chỉ được đọc những gì có trong TemplateContext.
 */

export interface NameForms {
  /** Student */
  pascal: string;
  /** student */
  camel: string;
  /** student (kebab-case: order-item) */
  kebab: string;
  /** students */
  plural: string;
  /** students (kebab-case số nhiều: order-items), dùng làm đường dẫn API */
  pluralKebab: string;
}

export interface FieldContext {
  name: string;
  type: FieldType;
  required: boolean;
  unique: boolean;
  options: string[];
  default?: string | number | boolean;
}

export interface EntityContext extends NameForms {
  name: string;
  ownerOnly: boolean;
  fields: FieldContext[];
  /** Quyền theo role, ví dụ { admin: 'CRUD', user: 'R' } */
  permissions: Record<string, string>;
}

export interface PageContext {
  id: string;
  route: string;
  title: string;
  /** Tên component React sinh ra, ví dụ StudentsPage */
  componentName: string;
  requireRole: string[];
}

export interface TemplateContext {
  project: { name: string; kebabName: string; version: number };
  db: { id: Database };
  auth: { allowSelfRegister: boolean };
  roles: string[];
  entities: EntityContext[];
  pages: PageContext[];
  /** Schema đã normalize, dùng khi template cần duyệt cây component/workflow */
  schema: ProjectSchema;
}
