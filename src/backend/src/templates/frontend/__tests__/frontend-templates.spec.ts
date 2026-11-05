import { join, relative } from 'node:path';
import { buildContext, listTemplates, render, root } from './render-helper';

describe('template FE khung dự án', () => {
  const files = listTemplates(root);

  it('có đủ các template khung', () => {
    const names = files.map((f) => relative(root, f)).sort();
    expect(names).toEqual(
      [
        'Dockerfile.hbs',
        'index.html.hbs',
        'src/api/client.ts.hbs',
        'src/auth/AuthContext.tsx.hbs',
        'src/auth/LoginPage.tsx.hbs',
        'src/auth/ProtectedRoute.tsx.hbs',
        'src/layout/AppLayout.tsx.hbs',
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
    expect(render(file, buildContext())).not.toContain('{{');
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
    expect(app).toContain('path="/students"');
    expect(app).toContain('<StudentsPage />');
    expect(app).toContain('path="/about"');
    expect(app).toContain('<AboutPage />');
    expect(app).toContain('<Navigate to="/students" replace />');
    expect(app).toContain('<Route path="/login" element={<LoginPage />} />');
    expect(app).toContain('path="*"');
    expect(app).toContain('title="Giới thiệu &quot;App&quot; &amp; more"');
  });

  it('không redirect khi trang đầu đã là "/"', () => {
    const context = buildContext();
    context.pages[0].route = '/';
    expect(render(join(root, 'src/App.tsx.hbs'), context)).not.toContain('<Navigate');
  });

  it('không có page nào vẫn render được', () => {
    const context = buildContext();
    context.pages = [];
    const app = render(join(root, 'src/App.tsx.hbs'), context);
    expect(app).not.toContain('<Navigate');
    expect(app).not.toContain('{{');
  });

  it('App.tsx truyền requireRole của từng page vào ProtectedRoute', () => {
    const app = render(join(root, 'src/App.tsx.hbs'), buildContext());
    expect(app).toContain('<ProtectedRoute requireRole={ ["admin","user"] }>');
    expect(app).toContain('<ProtectedRoute requireRole={ [] }>');
  });

  it('AppLayout sinh menu từ pages, giá trị người dùng đi qua json (không bị escape HTML)', () => {
    const context = buildContext();
    context.project.name = 'Quản lý <A&B>';
    context.pages[1].title = 'Giới thiệu "App" & more';
    const layout = render(join(root, 'src/layout/AppLayout.tsx.hbs'), context);
    expect(layout).toContain('{ title: "Sinh viên", route: "/students", requireRole: ["admin","user"] },');
    expect(layout).toContain('{ title: "Giới thiệu \\"App\\" & more", route: "/about", requireRole: [] },');
    expect(layout).toContain('<strong>Quản lý &lt;A&amp;B&gt;</strong>');
  });

  it('client.ts dùng baseURL /api và xử lý 401', () => {
    const client = render(join(root, 'src/api/client.ts.hbs'), buildContext());
    expect(client).toContain("baseURL: '/api'");
    expect(client).toContain('status === 401');
    expect(client).toContain('Bearer ${token}');
  });
});
