import { inventorySample, schoolAdminSample } from '@codeflow/schema';
import { generate } from '../../../generator/pipeline';

const frontendFiles = async (schema: typeof schoolAdminSample) =>
  (await generate(schema)).filter((f) => f.path.startsWith('frontend/'));

describe('FE sinh ra từ generator thật', () => {
  it('school-admin: có trang CRUD cho Student và file khung', async () => {
    const paths = (await frontendFiles(schoolAdminSample)).map((f) => f.path);
    expect(paths).toEqual([
      'frontend/.dockerignore',
      'frontend/Dockerfile',
      'frontend/index.html',
      'frontend/nginx.conf',
      'frontend/package.json',
      'frontend/src/App.tsx',
      'frontend/src/api/client.ts',
      'frontend/src/api/errors.ts',
      'frontend/src/api/student.api.ts',
      'frontend/src/api/types.ts',
      'frontend/src/auth/AuthContext.tsx',
      'frontend/src/auth/LoginPage.tsx',
      'frontend/src/auth/ProtectedRoute.tsx',
      'frontend/src/layout/AppLayout.tsx',
      'frontend/src/lib/fields.ts',
      'frontend/src/main.tsx',
      'frontend/src/pages/PagePlaceholder.tsx',
      'frontend/src/pages/student/DetailPage.tsx',
      'frontend/src/pages/student/FormPage.tsx',
      'frontend/src/pages/student/ListPage.tsx',
      'frontend/src/routes.ts',
      'frontend/src/types/student.ts',
      'frontend/tsconfig.json',
      'frontend/vite.config.ts',
    ]);
  });

  it('inventory: mỗi entity có đủ api, type và 3 trang', async () => {
    const paths = (await frontendFiles(inventorySample)).map((f) => f.path);
    for (const name of ['product', 'category', 'supplier']) {
      expect(paths).toEqual(
        expect.arrayContaining([
          `frontend/src/api/${name}.api.ts`,
          `frontend/src/types/${name}.ts`,
          `frontend/src/pages/${name}/ListPage.tsx`,
          `frontend/src/pages/${name}/FormPage.tsx`,
          `frontend/src/pages/${name}/DetailPage.tsx`,
        ]),
      );
    }
  });

  it.each([
    ['school-admin', schoolAdminSample],
    ['inventory', inventorySample],
  ])('%s: không còn {{ hay [object Object]', async (_name, schema) => {
    for (const file of await frontendFiles(schema)) {
      expect(file.content).not.toContain('{{');
      expect(file.content).not.toContain('[object Object]');
    }
  });

  it('api gọi đúng đường dẫn số nhiều và kiểu trả về theo contract', async () => {
    const files = await frontendFiles(inventorySample);
    const api = files.find((f) => f.path === 'frontend/src/api/product.api.ts')!.content;
    expect(api).toContain("const BASE = '/products'");
    expect(api).toContain('api.get<ListResult<Product>>');
    expect(api).toContain('res.data.data');
  });

  it('type sinh đúng kiểu field, enum thành union và field tùy chọn nullable', async () => {
    const files = await frontendFiles(inventorySample);
    const type = files.find((f) => f.path === 'frontend/src/types/product.ts')!.content;
    expect(type).toContain('name: string;');
    expect(type).toContain('description?: string | null;');
    expect(type).toContain('quantity: number;');
    expect(type).toContain("category?: 'Electronics' | 'Clothing' | 'Food' | 'Other' | null;");
    expect(type).toContain('inStock?: boolean | null;');
  });

  it('ma trận quyền trong AuthContext lấy từ permissions của schema', async () => {
    const files = await frontendFiles(inventorySample);
    const auth = files.find((f) => f.path === 'frontend/src/auth/AuthContext.tsx')!.content;
    expect(auth).toContain("Product: { admin: 'CRUD', manager: 'CRU', user: 'R' }");
    expect(auth).toContain("Supplier: { admin: 'CRUD', manager: 'R' }");
  });

  it('page tùy biến trùng route entity bị bỏ qua trong menu và router (reservedRoutes)', async () => {
    const files = await frontendFiles(inventorySample);
    const routes = files.find((f) => f.path === 'frontend/src/routes.ts')!.content;
    expect(routes).toContain("'/products'");
    expect(routes).toContain("'/suppliers/:id/edit'");
    const app = files.find((f) => f.path === 'frontend/src/App.tsx')!.content;
    expect(app).toContain('filter((page) => !isReserved(page.route))');
    expect(app).toContain('path="/products/:id/edit"');
  });

  it('FormPage dùng input theo kiểu field', async () => {
    const files = await frontendFiles(inventorySample);
    const form = files.find((f) => f.path === 'frontend/src/pages/product/FormPage.tsx')!.content;
    expect(form).toContain('<textarea');
    expect(form).toContain('<select');
    expect(form).toContain('type="checkbox"');
    expect(form).toContain('type="date"');
    expect(form).toContain('type="number"');
    expect(form).toContain("<option value={'Electronics'}>");
  });

  it('nginx.conf và Dockerfile đủ các thành phần', async () => {
    const files = await frontendFiles(schoolAdminSample);
    const nginx = files.find((f) => f.path === 'frontend/nginx.conf')!.content;
    for (const part of ['listen 80', 'try_files $uri /index.html', 'http://backend:3000', 'gzip on', 'immutable', 'no-store', 'X-Content-Type-Options', 'client_max_body_size']) {
      expect(nginx).toContain(part);
    }
    const docker = files.find((f) => f.path === 'frontend/Dockerfile')!.content;
    expect(docker).toContain('nginx:alpine');
    expect(docker).toContain('EXPOSE 80');
  });
});
