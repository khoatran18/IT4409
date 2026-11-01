import {
  inventorySample,
  schoolAdminSample,
  type ProjectSchema,
} from '@codeflow/schema';
import { joinPath, validateProject, type SchemaIssue } from './index';

const clone = (sample: ProjectSchema) => structuredClone(sample);

const byPath = (a: { path: string }, b: { path: string }) =>
  a.path.localeCompare(b.path);

/** Sắp xếp cả hai vế để test không phụ thuộc thứ tự các luật chạy */
function expectErrors(
  schema: unknown,
  expected: Array<Pick<SchemaIssue, 'path' | 'code'>>,
) {
  expect(errorsOf(schema)).toEqual([...expected].sort(byPath));
}

function errorsOf(schema: unknown): Array<Pick<SchemaIssue, 'path' | 'code'>> {
  return validateProject(schema)
    .errors.map(({ path, code }) => ({ path, code }))
    .sort(byPath);
}

describe('validateProject', () => {
  it('chấp nhận hai schema mẫu', () => {
    for (const sample of [schoolAdminSample, inventorySample]) {
      const report = validateProject(sample);
      expect(report.errors).toEqual([]);
      expect(report.valid).toBe(true);
    }
  });

  it('lỗi Zod trả đường dẫn dạng mảng', () => {
    const bad = clone(schoolAdminSample);
    bad.entities[0].name = '1bad';
    expectErrors(bad, [{ path: 'entities[0].name', code: 'INVALID' }]);
    expectErrors({}, [{ path: 'meta', code: 'REQUIRED' }]);
  });

  it('entity trùng tên (kể cả khác kiểu chữ) và tên dành riêng', () => {
    const bad = clone(schoolAdminSample);
    bad.entities.push({ name: 'student', ownerOnly: false, fields: [] });
    bad.entities.push({ name: 'User', ownerOnly: false, fields: [] });
    expectErrors(bad, [
      { path: 'entities[1].name', code: 'DUPLICATE' },
      { path: 'entities[2].name', code: 'INVALID' },
    ]);
  });

  it('field trùng, tên dành riêng, default sai kiểu', () => {
    const bad = clone(schoolAdminSample);
    bad.entities[0].fields.push(
      { name: 'Name', type: 'string' },
      { name: 'createdAt', type: 'date' },
      { name: 'nickname', type: 'string', default: 5 },
    );
    expectErrors(bad, [
      { path: 'entities[0].fields[3].name', code: 'DUPLICATE' },
      { path: 'entities[0].fields[4].name', code: 'INVALID' },
      { path: 'entities[0].fields[5].default', code: 'INVALID' },
    ]);
  });

  it('enum thiếu options, option trùng hoặc rỗng, default ngoài options', () => {
    const bad = clone(schoolAdminSample);
    bad.entities[0].fields.push(
      { name: 'a', type: 'enum' },
      { name: 'b', type: 'enum', options: ['x', 'x', ' '], default: 'z' },
    );
    expectErrors(bad, [
      { path: 'entities[0].fields[3].options', code: 'REQUIRED' },
      { path: 'entities[0].fields[4].options[1]', code: 'DUPLICATE' },
      { path: 'entities[0].fields[4].options[2]', code: 'INVALID' },
      { path: 'entities[0].fields[4].default', code: 'INVALID' },
    ]);
  });

  it('permissions tham chiếu entity hoặc role không tồn tại', () => {
    const bad = clone(schoolAdminSample);
    bad.permissions.Ghost = { admin: 'R' };
    bad.permissions.Student.boss = 'R';
    expectErrors(bad, [
      { path: 'permissions.Student.boss', code: 'UNKNOWN_REF' },
      { path: 'permissions.Ghost', code: 'UNKNOWN_REF' },
    ]);
  });

  it('page: route và id trùng, requireRole lạ', () => {
    const bad = clone(schoolAdminSample);
    bad.pages.push({
      ...clone(schoolAdminSample).pages[0],
      requireRole: ['boss'],
    });
    const errors = errorsOf(bad);
    expect(errors).toEqual(
      expect.arrayContaining([
        { path: 'pages[1].id', code: 'DUPLICATE' },
        { path: 'pages[1].route', code: 'DUPLICATE' },
        { path: 'pages[1].requireRole[0]', code: 'UNKNOWN_REF' },
      ]),
    );
  });

  it('component: type lạ, thiếu prop bắt buộc, tham chiếu entity/field/workflow', () => {
    const bad = clone(schoolAdminSample);
    bad.pages[0].components = [
      { id: 'a', type: 'Hologram', props: {} },
      { id: 'b', type: 'Table', props: {} },
      { id: 'c', type: 'Table', props: { entity: 'Ghost', columns: ['x'] } },
      {
        id: 'd',
        type: 'Table',
        props: { entity: 'Student', columns: ['name', 'salary'] },
      },
      { id: 'e', type: 'Form', props: {} },
      { id: 'f', type: 'Select', props: {} },
      {
        id: 'g',
        type: 'Container',
        props: {},
        events: { onClick: 'nope' },
        children: [{ id: 'g', type: 'Text', props: {} }],
      },
    ];
    expectErrors(bad, [
      { path: 'pages[0].components[0].type', code: 'UNKNOWN_REF' },
      { path: 'pages[0].components[1].props.entity', code: 'REQUIRED' },
      { path: 'pages[0].components[1].props.columns', code: 'REQUIRED' },
      { path: 'pages[0].components[2].props.entity', code: 'UNKNOWN_REF' },
      { path: 'pages[0].components[3].props.columns[1]', code: 'UNKNOWN_REF' },
      { path: 'pages[0].components[4].props.entity', code: 'REQUIRED' },
      { path: 'pages[0].components[5].props.options', code: 'REQUIRED' },
      { path: 'pages[0].components[6].children[0].id', code: 'DUPLICATE' },
      { path: 'pages[0].components[6].events.onClick', code: 'UNKNOWN_REF' },
    ]);
  });

  it('workflow: id, node, cạnh trỏ node không tồn tại', () => {
    const bad = clone(schoolAdminSample);
    bad.workflows.push({
      id: 'wf1',
      nodes: [
        { id: 'n1', type: 'navigate', config: {} },
        { id: 'n1', type: 'navigate', config: {} },
      ],
      edges: [{ from: 'n1', to: 'n9' }],
    });
    expectErrors(bad, [
      { path: 'workflows[1].id', code: 'DUPLICATE' },
      { path: 'workflows[1].nodes[1].id', code: 'DUPLICATE' },
      { path: 'workflows[1].edges[0].to', code: 'UNKNOWN_REF' },
    ]);
  });

  it('cảnh báo (không chặn) cho entity chưa có field và trang rỗng', () => {
    const schema = clone(schoolAdminSample);
    schema.entities.push({ name: 'Empty', ownerOnly: false, fields: [] });
    schema.pages.push({
      id: 'p2',
      route: '/blank',
      title: 'Trống',
      requireRole: [],
      components: [],
    });
    const report = validateProject(schema);
    expect(report.valid).toBe(true);
    expect(report.warnings.map((w) => w.path)).toEqual([
      'entities[1].fields',
      'pages[1].components',
    ]);
  });

  it('tên project không còn ký tự hợp lệ', () => {
    const bad = clone(schoolAdminSample);
    bad.meta.name = '###';
    expectErrors(bad, [{ path: 'meta.name', code: 'INVALID' }]);
  });
});

describe('joinPath', () => {
  it('ghép khóa và chỉ số', () => {
    expect(joinPath(['pages', 0, 'components', 1, 'props', 'entity'])).toBe(
      'pages[0].components[1].props.entity',
    );
  });
});
