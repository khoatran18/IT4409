import type { ComponentNode, ProjectSchema } from '@codeflow/schema';
import type { HelperOptions } from 'handlebars';

/** Component có template trong `templates/frontend/src/components`; type khác sinh `Unsupported`. */
export const FRONTEND_COMPONENTS = [
  'Button',
  'Card',
  'Checkbox',
  'Container',
  'Form',
  'Grid',
  'Heading',
  'Input',
  'Select',
  'Table',
  'Text',
] as const;

/** Chỉ các component này nhận children. */
const CONTAINERS = new Set<string>(['Card', 'Container', 'Grid']);

const KNOWN = new Set<string>(FRONTEND_COMPONENTS);

function componentOf(node: ComponentNode): string {
  return KNOWN.has(node.type) ? node.type : 'Unsupported';
}

/**
 * JSX của một cây component. Mọi giá trị người dùng (props, events, type) đi qua JSON.stringify
 * thành biểu thức JS, tên thẻ chỉ lấy từ danh sách cố định nên không có chuỗi nào được nội suy thô vào mã.
 */
export function jsxTree(nodes: ComponentNode[]): string {
  return nodes
    .map((node) => {
      const name = componentOf(node);
      const attrs = [`props={${JSON.stringify(node.props ?? {})}}`];
      if (node.events && Object.keys(node.events).length > 0) {
        attrs.push(`events={${JSON.stringify(node.events)}}`);
      }
      if (name === 'Unsupported') attrs.push(`type={${JSON.stringify(node.type)}}`);
      const open = `<${name} ${attrs.join(' ')}`;
      return CONTAINERS.has(name)
        ? `${open}>${jsxTree(node.children ?? [])}</${name}>`
        : `${open} />`;
    })
    .join('\n');
}

/** Tên các component xuất hiện trong cây (đã bỏ trùng, theo thứ tự chữ cái) để page import. */
export function usedComponents(nodes: ComponentNode[]): string[] {
  const names = new Set<string>();
  const visit = (list: ComponentNode[]) => {
    for (const node of list) {
      names.add(componentOf(node));
      if (CONTAINERS.has(componentOf(node))) visit(node.children ?? []);
    }
  };
  visit(nodes);
  return [...names].sort();
}

function pageNodes(pageId: string, options: HelperOptions): ComponentNode[] {
  const schema = (options.data as { root: { schema: ProjectSchema } }).root.schema;
  return schema.pages.find((page) => page.id === pageId)?.components ?? [];
}

export const pageJsx = (pageId: string, options: HelperOptions): string =>
  jsxTree(pageNodes(pageId, options));

export const pageComponents = (pageId: string, options: HelperOptions): string[] =>
  usedComponents(pageNodes(pageId, options));
