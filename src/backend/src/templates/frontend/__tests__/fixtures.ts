import { projectSchema, shopSample, type ComponentNode, type ProjectSchema } from '@codeflow/schema';
import { buildContext } from '../../../generator/steps/build-context';
import { formatFiles } from '../../../generator/steps/format';
import { normalize } from '../../../generator/steps/normalize';
import { pack } from '../../../generator/steps/pack';
import { render } from '../../../generator/steps/render';
import type { GeneratedFile } from '../../../generator/types';

const node = (
  id: string,
  type: string,
  props: Record<string, unknown> = {},
  rest: Partial<ComponentNode> = {},
): ComponentNode => ({ id, type, props, ...rest });

/**
 * Shop (Customer 1-n Order) kèm trang kéo thả dùng đủ 11 component, có giá trị "khó" trong props
 * (nháy, `</script>`, `${}`, `{{}}`) để kiểm tra chúng không bị nội suy thô vào mã.
 */
export const kitchenSinkSample: ProjectSchema = {
  ...structuredClone(shopSample),
  pages: [
    {
      id: 'p1',
      route: '/overview',
      title: 'Tổng quan',
      requireRole: [],
      components: [
        node('c1', 'Heading', { text: 'Tổng quan "shop" </script> ${x} {{y}}', level: 1 }),
        node('c2', 'Text', { content: "It's `text`", size: 'lg', weight: 'bold' }),
        node(
          'c3',
          'Container',
          { direction: 'row', gap: 8, align: 'center', wrap: true },
          {
            children: [
              node('c4', 'Input', { label: 'Tên', placeholder: 'Nhập', type: 'email', bindField: 'name' }),
              node('c5', 'Select', { label: 'Loại', options: ['A', 'B "quoted"'], bindField: 'kind' }),
              node('c6', 'Select', { label: 'Khách', entity: 'Customer', bindField: 'customerId' }),
              node('c7', 'Checkbox', { label: 'Đồng ý', bindField: 'agree' }),
              node('c8', 'Button', { text: 'Gửi', variant: 'secondary' }, { events: { onClick: 'wf1' } }),
            ],
          },
        ),
        node(
          'c9',
          'Grid',
          { columns: 3, gap: 12, align: 'start' },
          {
            children: [
              node('c10', 'Card', { title: 'Đơn hàng' }, {
                children: [
                  node('c11', 'Table', { entity: 'Order', columns: ['code', 'customer', 'total', 'status'], pageSize: 5, actions: ['edit', 'delete'] }, { events: { onRowClick: 'wf1' } }),
                ],
              }),
              node('c12', 'Card', { title: 'Thêm đơn' }, {
                children: [node('c13', 'Form', { entity: 'Order', mode: 'create', submitText: 'Tạo' }, { events: { onSubmit: 'wf1' } })],
              }),
              node('c14', 'Table', { entity: 'Customer', columns: ['name', 'email'] }),
            ],
          },
        ),
      ],
    },
    {
      id: 'p2',
      route: '/edit-order/:id',
      title: 'Sửa đơn',
      requireRole: ['admin'],
      components: [node('d1', 'Form', { entity: 'Order', mode: 'edit', submitText: 'Cập nhật' })],
    },
    {
      id: 'p3',
      route: '/orders',
      title: 'Trùng route entity',
      requireRole: [],
      components: [node('e1', 'Text', { content: 'bị bỏ qua' })],
    },
    {
      id: 'p4',
      route: '/empty',
      title: 'Trống',
      requireRole: [],
      components: [],
    },
  ],
  workflows: [
    {
      id: 'wf1',
      nodes: [
        { id: 'n1', type: 'callApi', config: { entity: 'Order', op: 'create' } },
        { id: 'n2', type: 'navigate', config: { to: '/orders' } },
      ],
      edges: [{ from: 'n1', to: 'n2' }],
    },
  ],
};

/**
 * Sinh file theo đúng các bước của pipeline nhưng bỏ bước validate: `COMPONENT_REGISTRY` của validator
 * (thuộc phần backend) chưa biết component `Grid`, nên generate() từ chối schema có Grid.
 */
export async function generateWithoutValidation(schema: ProjectSchema): Promise<GeneratedFile[]> {
  const context = buildContext(normalize(projectSchema.parse(schema)));
  return pack(await formatFiles(render(context)));
}
