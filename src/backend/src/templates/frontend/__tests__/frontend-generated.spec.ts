import { inventorySample, schoolAdminSample, shopSample } from '@codeflow/schema';
import { generate } from '../../../generator/pipeline';
import { generateWithoutValidation, kitchenSinkSample } from './fixtures';
import { hasUnrenderedHandlebars } from './render-helper';

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
      ].map((name) => `frontend/src/components/${name}.tsx`),
      'frontend/src/layout/AppLayout.tsx',
      'frontend/src/lib/entities.ts',
      'frontend/src/lib/fields.ts',
      'frontend/src/main.tsx',
      'frontend/src/pages/PagePlaceholder.tsx',
      'frontend/src/pages/StudentsPage.tsx',
      'frontend/src/pages/student/DetailPage.tsx',
      'frontend/src/pages/student/FormPage.tsx',
      'frontend/src/pages/student/ListPage.tsx',
      'frontend/src/routes.ts',
      'frontend/src/runtime/PageState.tsx',
      'frontend/src/runtime/props.ts',
      'frontend/src/types/student.ts',
      'frontend/src/workflows/index.ts',
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
      expect(hasUnrenderedHandlebars(file.content)).toBe(false);
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

describe('trang kéo thả sinh JSX thật', () => {
  it('school-admin: page Students render Table và Button, không còn PagePlaceholder cho page', async () => {
    const files = await frontendFiles(schoolAdminSample);
    const page = files.find((f) => f.path === 'frontend/src/pages/StudentsPage.tsx')!.content;
    expect(page).toContain("import Table from '../components/Table'");
    expect(page).toContain("import Button from '../components/Button'");
    expect(page).toContain("<Table");
    expect(page).toContain("entity: 'Student'");
    expect(page).toContain("onClick: 'wf1'");
    const app = files.find((f) => f.path === 'frontend/src/App.tsx')!.content;
    expect(app).toContain("import StudentsPage from './pages/StudentsPage'");
    expect(app).not.toContain('<PagePlaceholder title="Sinh viên"');
  });

  it('workflows/index.ts là stub xuất runWorkflow và liệt kê id workflow của schema', async () => {
    const files = await frontendFiles(schoolAdminSample);
    const stub = files.find((f) => f.path === 'frontend/src/workflows/index.ts')!.content;
    expect(stub).toContain('export async function runWorkflow');
    expect(stub).toContain("'wf1'");
  });

  describe('kitchen sink (shop + trang dùng đủ 11 component)', () => {
    let files: Awaited<ReturnType<typeof generateWithoutValidation>>;
    const read = (path: string) => files.find((f) => f.path === `frontend/${path}`)!.content;

    beforeAll(async () => {
      files = (await generateWithoutValidation(kitchenSinkSample)).filter((f) => f.path.startsWith('frontend/'));
    });

    it('mỗi page có file riêng, import đúng component được dùng', () => {
      const paths = files.map((f) => f.path);
      for (const name of ['OverviewPage', 'EditOrderIdPage', 'OrdersPage']) {
        expect(paths).toContain(`frontend/src/pages/${name}.tsx`);
      }
      const overview = read('src/pages/OverviewPage.tsx');
      for (const type of ['Heading', 'Text', 'Container', 'Input', 'Select', 'Checkbox', 'Button', 'Grid', 'Card', 'Table', 'Form']) {
        expect(overview).toContain(`import ${type} from '../components/${type}'`);
      }
      expect(overview).toContain('<Grid');
      expect(overview).toContain('</Grid>');
    });

    it('giá trị người dùng nhập chỉ xuất hiện như literal chuỗi, không phá cú pháp', () => {
      const overview = read('src/pages/OverviewPage.tsx');
      expect(overview).toContain('Tổng quan "shop" </script> ${x} {{y}}');
      expect(overview).toContain("It's `text`");
      expect(overview).not.toContain('[object Object]');
    });

    it('page route trống ra component rỗng hợp lệ, page trùng route entity vẫn bị chặn ở App', () => {
      expect(read('src/pages/EmptyPage.tsx')).toContain('<PageStateProvider>');
      const app = read('src/App.tsx');
      expect(app).toContain('filter((page) => !isReserved(page.route))');
      expect(read('src/routes.ts')).toContain("'/orders'");
    });

    it('không còn cú pháp Handlebars hay [object Object] trong file nào', () => {
      for (const file of files) {
        // `{{y}}` là chuỗi người dùng nhập có chủ ý (xem fixtures), phải còn nguyên dạng chuỗi
        expect(hasUnrenderedHandlebars(file.content.replaceAll('{{y}}', ''))).toBe(false);
        expect(file.content).not.toContain('[object Object]');
      }
    });

    it('quan hệ: types, fields, form, list và API errors xử lý ref', () => {
      const order = read('src/types/order.ts');
      expect(order).toContain('customer: RefLabel;');
      expect(order).toContain('customerId?: string | null;');
      expect(order).toContain("'id' | 'createdAt' | 'updatedAt' | 'customer'");
      expect(order).toContain("type: 'ref'");
      const form = read('src/pages/order/FormPage.tsx');
      expect(form).toContain('<RefSelect');
      expect(form).toContain('entity="Customer"');
      expect(form).toContain('mapFieldErrors(orderFields, info.fields)');
      const list = read('src/pages/order/ListPage.tsx');
      expect(list).toContain("toggleSort('customerId')");
      expect(list).toContain('deleteErrorMessage(e)');
      const fields = read('src/lib/fields.ts');
      expect(fields).toContain('payload[field.ref?.idName');
      expect(read('src/api/errors.ts')).toContain('status === 409');
      expect(read('src/lib/entities.ts')).toContain("path: '/orders'");
    });
  });
});

describe('shopSample (Customer/Order) qua generator thật', () => {
  it('sinh đủ file cho hai entity liên kết', async () => {
    const paths = (await frontendFiles(shopSample)).map((f) => f.path);
    for (const name of ['customer', 'order']) {
      expect(paths).toContain(`frontend/src/pages/${name}/FormPage.tsx`);
    }
  });
});
