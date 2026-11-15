import type { ComponentNode } from '@codeflow/schema';
import { jsxTree, usedComponents } from './jsx';

const node = (type: string, props: Record<string, unknown> = {}, rest: Partial<ComponentNode> = {}): ComponentNode => ({
  id: type,
  type,
  props,
  ...rest,
});

describe('jsxTree', () => {
  it('lồng container, chỉ container nhận children', () => {
    const out = jsxTree([
      node('Grid', { columns: 2 }, { children: [node('Text', { content: 'a' }), node('Card', {}, { children: [node('Button')] })] }),
      node('Text', {}, { children: [node('Button')] }),
    ]);
    expect(out).toBe(
      '<Grid props={{"columns":2}}><Text props={{"content":"a"}} />\n<Card props={{}}><Button props={{}} /></Card></Grid>\n<Text props={{}} />',
    );
  });

  it('type lạ thành Unsupported và type được ghi lại dưới dạng chuỗi JSON, không thành tên thẻ', () => {
    const out = jsxTree([node('Evil /><script>alert(1)</script><X', { a: 1 })]);
    expect(out).toBe('<Unsupported props={{"a":1}} type={"Evil /><script>alert(1)</script><X"} />');
  });

  it('props và events chứa ký tự đặc biệt chỉ nằm trong literal JSON', () => {
    const out = jsxTree([node('Button', { text: '"}} <b> ${x}\n' }, { events: { 'on"Click': 'wf"1' } })]);
    expect(out).toContain('{"text":"\\"}} <b> ${x}\\n"}');
    expect(out).toContain('events={{"on\\"Click":"wf\\"1"}}');
  });
});

describe('usedComponents', () => {
  it('liệt kê component không trùng, kể cả con, kèm Unsupported', () => {
    expect(
      usedComponents([node('Card', {}, { children: [node('Table'), node('Table'), node('Chart')] }), node('Button')]),
    ).toEqual(['Button', 'Card', 'Table', 'Unsupported']);
  });
});
