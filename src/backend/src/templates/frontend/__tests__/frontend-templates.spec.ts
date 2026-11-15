import { join, relative, sep } from 'node:path';
import { buildContext, hasUnrenderedHandlebars, listTemplates, render, root } from './render-helper';

describe('template FE khung dự án', () => {
  const files = listTemplates(root);

  it('có đủ các template khung', () => {
    const names = files.map((f) => relative(root, f).split(sep).join('/')).sort();
    expect(names).toEqual(
      [
        '.dockerignore.hbs',
        'Dockerfile.hbs',
        'index.html.hbs',
        'src/api/__entity__.api.ts.hbs',
        'src/api/client.ts.hbs',
        'src/api/errors.ts.hbs',
        'src/api/types.ts.hbs',
        'src/auth/AuthContext.tsx.hbs',
        'src/auth/LoginPage.tsx.hbs',
        'src/auth/ProtectedRoute.tsx.hbs',
        ...[
          'Button',
          'Card',
          'Checkbox',
          'Container',
          'Form',
          'Grid',
          'Heading',
          'Input',
          'RefSelect',
          'Select',
          'Table',
          'Text',
          'Unsupported',
        ].map((name) => `src/components/${name}.tsx.hbs`),
        'src/layout/AppLayout.tsx.hbs',
        'src/lib/entities.ts.hbs',
        'src/lib/fields.ts.hbs',
        'src/pages/__entity__/DetailPage.tsx.hbs',
        'src/pages/__entity__/FormPage.tsx.hbs',
        'src/pages/__entity__/ListPage.tsx.hbs',
        'src/pages/__page__.tsx.hbs',
        'src/routes.ts.hbs',
        'src/runtime/PageState.tsx.hbs',
        'src/runtime/props.ts.hbs',
        'src/workflows/index.ts.hbs',
        'src/types/__entity__.ts.hbs',
        'nginx.conf.hbs',
        'package.json.hbs',
        'src/App.tsx.hbs',
        'src/pages/PagePlaceholder.tsx.hbs',
        'src/main.tsx.hbs',
        'tsconfig.json.hbs',
        'vite.config.ts.hbs',
      ].sort(),
    );
  });

  it.each(listTemplates(root).map((f) => [relative(root, f), f]))('%s render xong không còn {{', (_name, file) => {
    const output = render(file, buildContext());
    if (file.includes('__page__')) expect(hasUnrenderedHandlebars(output)).toBe(false);
    else expect(output).not.toContain('{{');
  });

  it('package.json hợp lệ', () => {
    const json = JSON.parse(render(join(root, 'package.json.hbs'), buildContext()));
    expect(json.name).toBe('school-admin-frontend');
    expect(json.dependencies).toHaveProperty('react-router-dom');
    expect(json.dependencies).toHaveProperty('axios');
  });

  it('tsconfig.json hợp lệ', () => {
    expect(() => JSON.parse(render(join(root, 'tsconfig.json.hbs'), buildContext()))).not.toThrow();
  });

  it('App.tsx có route cho mỗi page, redirect "/" về trang đầu và route 404', () => {
    const app = render(join(root, 'src/App.tsx.hbs'), buildContext());
    expect(app).toContain('route: "/students"');
    expect(app).toContain("import StudentsPage from './pages/StudentsPage'");
    expect(app).toContain('<StudentsPage />');
    expect(app).toContain('route: "/about"');
    expect(app).toContain('<AboutPage />');
    expect(app).toContain('<Navigate to="/students" replace />');
    expect(app).toContain('<Route path="/login" element={<LoginPage />} />');
    expect(app).toContain('path="*"');
    expect(app).not.toContain('Giới thiệu');
  });

  it('không redirect khi trang đầu đã là "/"', () => {
    const context = buildContext();
    context.pages[0].route = '/';
    expect(render(join(root, 'src/App.tsx.hbs'), context)).not.toContain('<Navigate');
  });

  it('không có page nào: redirect về list của entity đầu, hoặc không redirect nếu cũng không có entity', () => {
    const context = buildContext();
    context.pages = [];
    const app = render(join(root, 'src/App.tsx.hbs'), context);
    expect(app).toContain('<Navigate to="/students" replace />');
    context.entities = [];
    const empty = render(join(root, 'src/App.tsx.hbs'), context);
    expect(empty).not.toContain('<Navigate');
    expect(empty).not.toContain('{{');
  });

  it('App.tsx có 4 route cho mỗi entity với quyền tương ứng và truyền requireRole của page', () => {
    const app = render(join(root, 'src/App.tsx.hbs'), buildContext());
    expect(app).toContain('<ProtectedRoute entity="Student" action="read">');
    expect(app).toContain('<ProtectedRoute entity="Student" action="create">');
    expect(app).toContain('<ProtectedRoute entity="Student" action="update">');
    for (const path of ['/students', '/students/new', '/students/:id', '/students/:id/edit']) {
      expect(app).toContain(`path="${path}"`);
    }
    expect(app).toContain('requireRole: ["admin","user"]');
    expect(app).toContain('requireRole: []');
    expect(app).toContain('requireRole={page.requireRole}');
  });

  it('AppLayout sinh menu entity và pages, giá trị người dùng đi qua json (không bị escape HTML)', () => {
    const context = buildContext();
    context.project.name = 'Quản lý <A&B>';
    context.pages[1].title = 'Giới thiệu "App" & more';
    const layout = render(join(root, 'src/layout/AppLayout.tsx.hbs'), context);
    expect(layout).toContain("{ title: 'Danh sách Student', route: '/students', requireRole: [], entity: \"Student\" },");
    expect(layout).toContain('{ title: "Sinh viên", route: "/students", requireRole: ["admin","user"] },');
    expect(layout).toContain('{ title: "Giới thiệu \\"App\\" & more", route: "/about", requireRole: [] },');
    expect(layout).toContain('<strong>Quản lý &lt;A&amp;B&gt;</strong>');
  });

  it('AuthContext sinh ma trận quyền từ permissions của entity', () => {
    const auth = render(join(root, 'src/auth/AuthContext.tsx.hbs'), buildContext());
    expect(auth).toContain('"Student": {"admin":"CRUD","user":"R"},');
    expect(auth).toContain('can:');
  });

  it('routes.ts liệt kê route bị entity chiếm', () => {
    const routes = render(join(root, 'src/routes.ts.hbs'), buildContext());
    expect(routes).toContain("'/students/:id/edit',");
  });

  it('FormPage: option enum đi qua json, không bị escape HTML', () => {
    const form = render(join(root, 'src/pages/__entity__/FormPage.tsx.hbs'), buildContext());
    expect(form).toContain('<option value={ "B \\"quoted\\"" }>');
  });

  it('client.ts dùng baseURL /api và xử lý 401', () => {
    const client = render(join(root, 'src/api/client.ts.hbs'), buildContext());
    expect(client).toContain("baseURL: '/api'");
    expect(client).toContain('status === 401');
    expect(client).toContain('Bearer ${token}');
  });
});

describe('template component và trang kéo thả', () => {
  const pageFile = join(root, 'src/pages/__page__.tsx.hbs');

  it('mọi component trong registry FE có template', () => {
    const names = listTemplates(join(root, 'src/components')).map((f) => relative(join(root, 'src/components'), f));
    for (const type of ['Text', 'Heading', 'Button', 'Input', 'Select', 'Checkbox', 'Container', 'Card', 'Table', 'Form', 'Grid']) {
      expect(names).toContain(`${type}.tsx.hbs`);
    }
  });

  it('page render cây component lồng nhau, chỉ import component được dùng, nội dung người dùng đi qua JSON', () => {
    const context = buildContext();
    context.schema = {
      ...context.schema,
      pages: [
        {
          id: 'p1',
          route: '/students',
          title: 'Sinh viên',
          requireRole: [],
          components: [
            {
              id: 'c1',
              type: 'Container',
              props: { direction: 'row' },
              children: [
                { id: 'c2', type: 'Heading', props: { text: 'Chào "bạn" </h1> {{x}} ${y}' } },
                { id: 'c3', type: 'Button', props: { text: 'Gửi' }, events: { onClick: 'wf1' } },
              ],
            },
            { id: 'c4', type: 'Chart', props: {} },
          ],
        },
      ],
    };
    const out = render(pageFile, context);
    expect(out).toContain("import Container from '../components/Container'");
    expect(out).toContain("import Unsupported from '../components/Unsupported'");
    expect(out).not.toContain("components/Table'");
    expect(out).toContain('<Container props={{"direction":"row"}}><Heading props={{"text":"Chào \\"bạn\\" </h1> {{x}} ${y}"}} />');
    expect(out).toContain('events={{"onClick":"wf1"}}');
    expect(out).toContain('<Unsupported props={{}} type={"Chart"} />');
    expect(out).toContain('export default function StudentsPage()');
  });

  it('Table dùng api qua registry entity và phân trang theo pageSize', () => {
    const table = render(join(root, 'src/components/Table.tsx.hbs'), buildContext());
    expect(table).toContain('info.api');
    expect(table).toContain('pageSize');
    expect(table).toContain('toggleSort(sortKey(field))');
  });

  it('LoginPage phân biệt 401 và 403', () => {
    const login = render(join(root, 'src/auth/LoginPage.tsx.hbs'), buildContext());
    expect(login).toContain("info.status === 401");
    expect(login).toContain('info.status === 403');
    expect(login).toContain('Tài khoản đã bị khóa');
  });
});
