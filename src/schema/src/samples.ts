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
