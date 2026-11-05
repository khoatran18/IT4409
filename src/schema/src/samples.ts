import type { ProjectSchema } from './project-schema';

/** Schema mẫu 1: quản lý sinh viên (Postgres). */
export const schoolAdminSample: ProjectSchema = {
  meta: { name: 'school-admin', version: 1, database: 'postgres' },
  entities: [
    {
      name: 'Student',
      ownerOnly: false,
      fields: [
        { name: 'name', type: 'string', required: true },
        { name: 'email', type: 'string', unique: true },
        { name: 'age', type: 'number' },
      ],
    },
  ],
  roles: ['admin', 'user'],
  auth: { allowSelfRegister: false },
  permissions: { Student: { admin: 'CRUD', user: 'R' } },
  pages: [
    {
      id: 'p1',
      route: '/students',
      title: 'Sinh viên',
      requireRole: ['admin', 'user'],
      components: [
        {
          id: 'c1',
          type: 'Table',
          props: { entity: 'Student', columns: ['name', 'email', 'age'], pageSize: 10 },
        },
        { id: 'c2', type: 'Button', props: { text: 'Thêm' }, events: { onClick: 'wf1' } },
      ],
    },
  ],
  workflows: [{ id: 'wf1', nodes: [{ id: 'n1', type: 'navigate', config: { to: '/students/new' } }], edges: [] }],
};

/** Schema mẫu 2: quản lý kho (Postgres), phủ đủ kiểu field, enum, default, ownerOnly và số nhiều bất quy tắc. */
export const inventorySample: ProjectSchema = {
  meta: { name: 'inventory', version: 1, database: 'postgres' },
  entities: [
    {
      name: 'Product',
      ownerOnly: false,
      fields: [
        { name: 'name', type: 'string', required: true },
        { name: 'sku', type: 'string', required: true, unique: true },
        { name: 'description', type: 'text' },
        { name: 'price', type: 'number', required: true },
        { name: 'quantity', type: 'number', required: true, default: 0 },
        {
          name: 'category',
          type: 'enum',
          options: ['Electronics', 'Clothing', 'Food', 'Other'],
          default: 'Other',
        },
        { name: 'inStock', type: 'boolean', default: true },
        { name: 'releasedAt', type: 'date' },
      ],
    },
    {
      name: 'Category',
      ownerOnly: false,
      fields: [{ name: 'title', type: 'string', required: true, unique: true }],
    },
    {
      name: 'Supplier',
      ownerOnly: true,
      fields: [
        { name: 'companyName', type: 'string', required: true },
        { name: 'active', type: 'boolean', required: true, default: true },
      ],
    },
  ],
  roles: ['admin', 'user', 'manager'],
  auth: { allowSelfRegister: true },
  permissions: {
    Product: { admin: 'CRUD', manager: 'CRU', user: 'R' },
    Supplier: { admin: 'CRUD', manager: 'R' },
  },
  pages: [
    {
      id: 'products',
      route: '/products',
      title: 'Sản phẩm',
      requireRole: ['admin', 'manager', 'user'],
      components: [
        { id: 'products-heading', type: 'Heading', props: { text: 'Kho hàng' } },
        {
          id: 'products-table',
          type: 'Table',
          props: { entity: 'Product', columns: ['name', 'sku', 'price', 'quantity', 'category'] },
        },
        {
          id: 'products-add',
          type: 'Button',
          props: { text: 'Thêm sản phẩm' },
          events: { onClick: 'go-new-product' },
        },
      ],
    },
    {
      id: 'new-product',
      route: '/products/new',
      title: 'Thêm sản phẩm',
      requireRole: ['admin', 'manager'],
      components: [{ id: 'product-form', type: 'Form', props: { entity: 'Product', mode: 'create' } }],
    },
  ],
  workflows: [
    {
      id: 'go-new-product',
      nodes: [{ id: 'n1', type: 'navigate', config: { to: '/products/new' } }],
      edges: [],
    },
  ],
};
