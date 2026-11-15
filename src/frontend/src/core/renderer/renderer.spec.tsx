// @vitest-environment jsdom
import { inventorySample, shopSample, type ComponentNode, type Page, type ProjectSchema } from '@codeflow/schema'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { Preview } from './Preview'
import { sampleRows, sampleValue } from './sample-data'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const mounted: Root[] = []

async function mount(project: ProjectSchema, initialPageId?: string): Promise<HTMLElement> {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  mounted.push(root)
  await act(async () => root.render(<Preview project={project} initialPageId={initialPageId} />))
  return container
}

afterEach(async () => {
  await act(async () => mounted.splice(0).forEach((root) => root.unmount()))
  document.body.replaceChildren()
})

function project(components: ComponentNode[], extra: Partial<ProjectSchema> = {}): ProjectSchema {
  const page: Page = { id: 'p1', route: '/', title: 'Trang chủ', requireRole: [], components }
  return { ...structuredClone(inventorySample), pages: [page], workflows: [], ...extra }
}

const node = (id: string, type: string, props: Record<string, unknown> = {}, rest: Partial<ComponentNode> = {}): ComponentNode => ({
  id,
  type,
  props,
  ...rest,
})

async function click(el: Element | null | undefined): Promise<void> {
  await act(async () => (el as HTMLElement).click())
}

function setValue(el: HTMLInputElement | HTMLSelectElement, value: string): void {
  const proto = el instanceof HTMLSelectElement ? HTMLSelectElement : HTMLInputElement
  Object.getOwnPropertyDescriptor(proto.prototype, 'value')!.set!.call(el, value)
  el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }))
}

const text = (root: ParentNode, selector: string) => [...root.querySelectorAll(selector)].map((el) => el.textContent)

describe('component cơ bản', () => {
  it('vẽ Text, Heading, Button, Input, Select, Checkbox theo props và default của registry', async () => {
    const root = await mount(
      project([
        node('c1', 'Text', { content: 'Xin chào', weight: 'bold' }),
        node('c2', 'Heading', { text: 'Tiêu đề', level: 3 }),
        node('c3', 'Button', { text: 'Lưu', variant: 'secondary' }),
        node('c4', 'Input', { label: 'Tên', placeholder: 'Nhập tên', type: 'email' }),
        node('c5', 'Select', { label: 'Loại', options: ['A', 'B'] }),
        node('c6', 'Checkbox', { label: 'Đồng ý' }),
      ]),
    )
    expect(root.querySelector('span[style*="700"]')?.textContent).toBe('Xin chào')
    expect(root.querySelector('h3')?.textContent).toBe('Tiêu đề')
    expect(root.querySelector('.rp-button.rp-secondary')?.textContent).toBe('Lưu')
    const input = root.querySelector<HTMLInputElement>('input[type="email"]')!
    expect(input.placeholder).toBe('Nhập tên')
    expect(text(root, '.rp-content select option')).toEqual(['-- chọn --', 'A', 'B'])
    expect(root.querySelector('.rp-check span')?.textContent).toBe('Đồng ý')
  })

  it('Select theo entity lấy lựa chọn từ dữ liệu mẫu', async () => {
    const root = await mount(project([node('c1', 'Select', { entity: 'Product' })]))
    expect(text(root, '.rp-content select option').slice(0, 3)).toEqual(['-- chọn --', 'name 1', 'name 2'])
  })

  it('Container và Card vẽ children, Container áp direction và gap', async () => {
    const root = await mount(
      project([
        node('c1', 'Container', { direction: 'row', gap: 8 }, { children: [node('c2', 'Text', { content: 'a' })] }),
        node('c3', 'Card', { title: 'Thẻ' }, { children: [node('c4', 'Text', { content: 'b' })] }),
      ]),
    )
    const container = root.querySelector<HTMLElement>('.rp-container')!
    expect(container.style.flexDirection).toBe('row')
    expect(container.style.gap).toBe('8px')
    expect(container.textContent).toBe('a')
    expect(root.querySelector('.rp-card')?.textContent).toBe('Thẻb')
  })

  it('component lạ hiện khung cảnh báo thay vì vỡ trang', async () => {
    const root = await mount(project([node('c1', 'Chart'), node('c2', 'Text', { content: 'vẫn vẽ' })]))
    expect(root.querySelector('.rp-unknown')?.textContent).toContain('Chart')
    expect(root.textContent).toContain('vẫn vẽ')
  })

  it('Button không gắn workflow thì bấm không có gì xảy ra', async () => {
    const root = await mount(project([node('c1', 'Button', { text: 'Bấm' })]))
    await click(root.querySelector('.rp-button'))
    expect(root.querySelector('.rp-toast')).toBeNull()
  })
})

describe('dữ liệu mẫu', () => {
  const entity = inventorySample.entities[0]

  it('sinh giá trị theo kiểu field và xác định giữa các lần gọi', () => {
    const [first] = sampleRows(entity)
    expect(first).toMatchObject({ id: 'sample-1', name: 'name 1', quantity: expect.any(Number), category: 'Electronics', inStock: true })
    expect(first.releasedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(sampleRows(entity)).toEqual(sampleRows(entity))
    expect(sampleValue({ name: 'email', type: 'string' }, 1)).toBe('user2@example.com')
    expect(sampleRows(entity, 5)).toHaveLength(5)
  })
})

describe('Table', () => {
  const table = (props: Record<string, unknown> = {}) =>
    node('t1', 'Table', { entity: 'Product', columns: ['name', 'price', 'category', 'inStock'], pageSize: 10, ...props })

  it('vẽ đúng cột, phân trang theo pageSize và chuyển trang', async () => {
    const root = await mount(project([table()]))
    expect(text(root, 'thead th')).toEqual(['name', 'price', 'category', 'inStock', ''])
    expect(root.querySelectorAll('tbody tr')).toHaveLength(10)
    expect(root.querySelector('.rp-pager span')?.textContent).toBe('Trang 1 / 3')
    expect(root.querySelector('tbody tr td')?.textContent).toBe('name 1')
    expect(root.querySelector<HTMLButtonElement>('.rp-pager button')!.disabled).toBe(true)

    await click(root.querySelectorAll('.rp-pager button')[1])
    expect(root.querySelector('.rp-pager span')?.textContent).toBe('Trang 2 / 3')
    expect(root.querySelector('tbody tr td')?.textContent).toBe('name 11')
  })

  it('tìm kiếm lọc dữ liệu giả và về trang 1', async () => {
    const root = await mount(project([table()]))
    await click(root.querySelectorAll('.rp-pager button')[1])
    await act(async () => setValue(root.querySelector<HTMLInputElement>('.rp-search')!, 'name 23'))
    expect(text(root, 'tbody tr td:first-child')).toEqual(['name 23'])
    expect(root.querySelector('.rp-pager span')?.textContent).toBe('Trang 1 / 1')

    await act(async () => setValue(root.querySelector<HTMLInputElement>('.rp-search')!, 'không có gì khớp'))
    expect(root.querySelector('tbody')?.textContent).toBe('Không có dữ liệu')
  })

  it('actions quyết định nút Sửa/Xóa; Xóa bỏ dòng khỏi dữ liệu giả', async () => {
    const root = await mount(project([table({ actions: ['delete'] })]))
    expect(text(root, 'tbody tr:first-child button')).toEqual(['Xóa'])
    await click(root.querySelector('tbody tr button'))
    expect(root.querySelector('tbody tr td')?.textContent).toBe('name 2')

    const noActions = await mount(project([table({ actions: [] })]))
    expect(noActions.querySelector('tbody tr button')).toBeNull()
  })

  it('Sửa hiện thông báo giả lập', async () => {
    const root = await mount(project([table()]))
    await click(root.querySelector('tbody tr button'))
    expect(root.querySelector('.rp-toast')?.textContent).toContain('giả lập')
  })

  it('chưa chọn entity hoặc cột thì cảnh báo', async () => {
    expect((await mount(project([table({ entity: undefined })]))).querySelector('.rp-unknown')?.textContent).toContain('entity')
    expect((await mount(project([table({ columns: [] })]))).querySelector('.rp-unknown')?.textContent).toContain('cột')
  })
})

describe('Form', () => {
  const form = (props: Record<string, unknown> = {}) => node('f1', 'Form', { entity: 'Product', ...props })

  it('vẽ input theo kiểu field của entity', async () => {
    const root = await mount(project([form({ submitText: 'Tạo' })]))
    expect(text(root, '.rp-form .rp-field > span:first-child')).toEqual([
      'name *',
      'sku *',
      'description',
      'price *',
      'quantity *',
      'category',
      'inStock',
      'releasedAt',
    ])
    expect(root.querySelector('textarea')).not.toBeNull()
    expect(root.querySelector('input[type="number"]')).not.toBeNull()
    expect(root.querySelector('input[type="checkbox"]')).not.toBeNull()
    expect(root.querySelector('input[type="date"]')).not.toBeNull()
    expect(text(root, '.rp-form select option')).toContain('Clothing')
    expect(root.querySelector('button[type="submit"]')?.textContent).toBe('Tạo')
  })

  it('submit thiếu field bắt buộc thì báo lỗi, đủ thì hiện thông báo giả lập', async () => {
    const root = await mount(project([form()]))
    await act(async () => root.querySelector('form')!.requestSubmit())
    expect(text(root, '.rp-error')).toEqual(['Bắt buộc nhập', 'Bắt buộc nhập', 'Bắt buộc nhập'])
    expect(root.querySelector('.rp-toast')).toBeNull()

    const inputs = root.querySelectorAll<HTMLInputElement>('.rp-form input')
    await act(async () => setValue(inputs[0], 'Áo'))
    await act(async () => setValue(inputs[1], 'SKU-1'))
    await act(async () => setValue(root.querySelector<HTMLInputElement>('input[type="number"]')!, '150'))
    await act(async () => root.querySelector('form')!.requestSubmit())
    expect(root.querySelector('.rp-error')).toBeNull()
    expect(root.querySelector('.rp-toast')?.textContent).toBe('Đã lưu Product (giả lập)')
  })

  it('mode edit điền sẵn dữ liệu mẫu', async () => {
    const root = await mount(project([form({ mode: 'edit' })]))
    expect(root.querySelector<HTMLInputElement>('.rp-form input')!.value).toBe('name 1')
  })

  it('chưa chọn entity thì cảnh báo', async () => {
    expect((await mount(project([form({ entity: undefined })]))).querySelector('.rp-unknown')).not.toBeNull()
  })
})

describe('menu, role và điều hướng', () => {
  const pages: Page[] = [
    { id: 'home', route: '/', title: 'Trang chủ', requireRole: [], components: [node('a1', 'Button', { text: 'Đi quản trị' }, { events: { onClick: 'go-admin' } })] },
    { id: 'admin', route: '/admin', title: 'Quản trị', requireRole: ['admin'], components: [node('a2', 'Heading', { text: 'Khu quản trị' })] },
    { id: 'staff', route: '/staff', title: 'Nhân viên', requireRole: ['admin', 'manager'], components: [] },
  ]
  const multi = (workflows: ProjectSchema['workflows'] = []) => project([], { pages, workflows })
  const nav = (to: string): ProjectSchema['workflows'][number] => ({
    id: 'go-admin',
    nodes: [{ id: 'n1', type: 'navigate', config: { to } }],
    edges: [],
  })

  const menu = (root: HTMLElement) => text(root, '.rp-nav')

  it('menu ẩn mục theo requireRole và đổi khi chọn role khác', async () => {
    const root = await mount(multi())
    expect(menu(root)).toEqual(['Trang chủ', 'Quản trị', 'Nhân viên'])

    await act(async () => setValue(root.querySelector<HTMLSelectElement>('select[aria-label="Xem với role"]')!, 'manager'))
    expect(menu(root)).toEqual(['Trang chủ', 'Nhân viên'])

    await act(async () => setValue(root.querySelector<HTMLSelectElement>('select[aria-label="Xem với role"]')!, 'user'))
    expect(menu(root)).toEqual(['Trang chủ'])
  })

  it('bấm mục menu chuyển trang bằng state nội bộ', async () => {
    const root = await mount(multi())
    await click([...root.querySelectorAll('.rp-nav')].find((b) => b.textContent === 'Quản trị'))
    expect(root.querySelector('h2')?.textContent).toBe('Khu quản trị')
    expect(root.querySelector('.rp-nav-active')?.textContent).toBe('Quản trị')
  })

  it('đang ở trang bị ẩn khi đổi role thì hiện 403', async () => {
    const root = await mount(multi(), 'admin')
    expect(root.querySelector('h2')?.textContent).toBe('Khu quản trị')
    await act(async () => setValue(root.querySelector<HTMLSelectElement>('select[aria-label="Xem với role"]')!, 'user'))
    expect(root.querySelector('h1')?.textContent).toBe('403')
  })

  it('Button có workflow navigate chuyển sang page có route đó', async () => {
    const root = await mount(multi([nav('/admin')]))
    await click(root.querySelector('.rp-button'))
    expect(root.querySelector('h2')?.textContent).toBe('Khu quản trị')
  })

  it('navigate tới route không có page thì báo trong preview, không đổi trang', async () => {
    const root = await mount(multi([nav('/students/new')]))
    await click(root.querySelector('.rp-button'))
    expect(root.querySelector('.rp-toast')?.textContent).toContain('/students/new')
    expect(root.querySelector('.rp-nav-active')?.textContent).toBe('Trang chủ')
  })

  it('workflow không tồn tại hoặc lỗi giữa chừng thì báo bằng toast lỗi', async () => {
    const broken = { id: 'go-admin', nodes: [{ id: 'n1', type: 'callApi' as const, config: { entity: 'Nope' } }], edges: [] }
    const root = await mount(multi([broken]))
    await click(root.querySelector('.rp-button'))
    expect(root.querySelector('.rp-toast-error')?.textContent).toContain('Nope')

    const missing = await mount(multi([]))
    await click(missing.querySelector('.rp-button'))
    expect(missing.querySelector('.rp-toast')?.textContent).toContain('không tồn tại')
  })

  it('project không có page nào vẫn vẽ được', async () => {
    const root = await mount({ ...multi(), pages: [] })
    expect(root.textContent).toContain('chưa có trang nào')
  })
})

describe('bố cục Grid và Container', () => {
  it('Grid chia cột theo columns (1-4), áp gap và align', async () => {
    const child = (id: string) => node(id, 'Text', { content: id })
    const root = await mount(project([node('g', 'Grid', { columns: 3, gap: 8, align: 'center' }, { children: [child('a'), child('b'), child('c')] })]))
    const grid = root.querySelector<HTMLElement>('.rp-grid')!
    expect(grid.style.gridTemplateColumns).toBe('repeat(3, minmax(0, 1fr))')
    expect(grid.style.gap).toBe('8px')
    expect(grid.style.alignItems).toBe('center')
    expect(grid.textContent).toBe('abc')

    const clamped = await mount(project([node('g', 'Grid', { columns: 9 })]))
    expect(clamped.querySelector<HTMLElement>('.rp-grid')!.style.gridTemplateColumns).toBe('repeat(4, minmax(0, 1fr))')
    const byDefault = await mount(project([node('g', 'Grid')]))
    expect(byDefault.querySelector<HTMLElement>('.rp-grid')!.style.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))')
  })

  it('Container áp align và wrap', async () => {
    const root = await mount(project([node('c', 'Container', { direction: 'row', align: 'end', wrap: true })]))
    const el = root.querySelector<HTMLElement>('.rp-container')!
    expect(el.style.alignItems).toBe('flex-end')
    expect(el.style.flexWrap).toBe('wrap')
  })
})

describe('workflow trong preview', () => {
  const wf = (nodes: ProjectSchema['workflows'][number]['nodes'], edges: ProjectSchema['workflows'][number]['edges'] = []) => [{ id: 'wf1', nodes, edges }]
  const button = node('b', 'Button', { text: 'Chạy' }, { events: { onClick: 'wf1' } })

  it('Input có bindField lưu giá trị, condition rẽ nhánh theo giá trị đó và showMessage hiện toast', async () => {
    const nodes = [
      { id: 'n1', type: 'condition' as const, config: { source: 'values', field: 'name', operator: 'eq', value: 'An' } },
      { id: 'n2', type: 'showMessage' as const, config: { kind: 'success', text: 'Đúng tên' } },
      { id: 'n3', type: 'showMessage' as const, config: { kind: 'error', text: 'Sai tên' } },
    ]
    const edges = [
      { from: 'n1', to: 'n2', branch: 'true' as const },
      { from: 'n1', to: 'n3', branch: 'false' as const },
    ]
    const root = await mount(project([node('i', 'Input', { bindField: 'name' }), button], { workflows: wf(nodes, edges) }))
    await click(root.querySelector('.rp-button'))
    expect(root.querySelector('.rp-toast-error')?.textContent).toBe('Sai tên')

    await act(async () => setValue(root.querySelector<HTMLInputElement>('input')!, 'An'))
    expect(root.querySelector<HTMLInputElement>('input')!.value).toBe('An')
    await click(root.querySelector('.rp-button'))
    expect(root.querySelector('.rp-toast-success')?.textContent).toBe('Đúng tên')
  })

  it('callApi giả lập trên dữ liệu mẫu rồi navigate sang page khác', async () => {
    const nodes = [
      { id: 'n1', type: 'callApi' as const, config: { entity: 'Product', op: 'create' } },
      { id: 'n2', type: 'navigate' as const, config: { to: '/other' } },
    ]
    const other: Page = { id: 'p2', route: '/other', title: 'Khác', requireRole: [], components: [node('h', 'Heading', { text: 'Trang khác' })] }
    const base = project([button], { workflows: wf(nodes, [{ from: 'n1', to: 'n2' }]) })
    const root = await mount({ ...base, pages: [...base.pages, other] })
    await click(root.querySelector('.rp-button'))
    expect(root.querySelector('h2')?.textContent).toBe('Trang khác')
  })

  it('đổi trang thì các ô bind bắt đầu lại từ rỗng', async () => {
    const other: Page = { id: 'p2', route: '/other', title: 'Khác', requireRole: [], components: [] }
    const base = project([node('i', 'Input', { bindField: 'name' })])
    const root = await mount({ ...base, pages: [...base.pages, other] })
    await act(async () => setValue(root.querySelector<HTMLInputElement>('input')!, 'An'))
    await click([...root.querySelectorAll('.rp-nav')].find((b) => b.textContent === 'Khác'))
    await click([...root.querySelectorAll('.rp-nav')].find((b) => b.textContent === 'Trang chủ'))
    expect(root.querySelector<HTMLInputElement>('input')!.value).toBe('')
  })

  it('Checkbox bind và onChange chạy workflow', async () => {
    const nodes = [{ id: 'n1', type: 'showMessage' as const, config: { kind: 'info', text: 'Đã đổi' } }]
    const root = await mount(project([node('k', 'Checkbox', { bindField: 'ok' }, { events: { onChange: 'wf1' } })], { workflows: wf(nodes) }))
    await click(root.querySelector('input[type="checkbox"]'))
    expect(root.querySelector<HTMLInputElement>('input[type="checkbox"]')!.checked).toBe(true)
    expect(root.querySelector('.rp-toast-info')?.textContent).toBe('Đã đổi')
  })

  it('Form có workflow onSubmit chạy workflow thay cho lưu giả lập, với giá trị form', async () => {
    const nodes = [
      { id: 'n1', type: 'callApi' as const, config: { entity: 'Product', op: 'create' } },
      { id: 'n2', type: 'showMessage' as const, config: { kind: 'success', text: 'Đã tạo qua workflow' } },
    ]
    const form = node('f', 'Form', { entity: 'Product' }, { events: { onSubmit: 'wf1' } })
    const root = await mount(project([form], { workflows: wf(nodes, [{ from: 'n1', to: 'n2' }]) }))
    const inputs = root.querySelectorAll<HTMLInputElement>('.rp-form input')
    await act(async () => setValue(inputs[0], 'Áo'))
    await act(async () => setValue(inputs[1], 'SKU-1'))
    await act(async () => setValue(root.querySelector<HTMLInputElement>('input[type="number"]')!, '150'))
    await act(async () => root.querySelector('form')!.requestSubmit())
    expect(root.querySelector('.rp-toast')?.textContent).toBe('Đã tạo qua workflow')
  })

  it('Table onRowClick truyền id dòng cho callApi idSource = param', async () => {
    const nodes = [
      { id: 'n1', type: 'callApi' as const, config: { entity: 'Product', op: 'get', idSource: 'param' } },
      { id: 'n2', type: 'condition' as const, config: { source: 'result', field: 'name', operator: 'eq', value: 'name 2' } },
      { id: 'n3', type: 'showMessage' as const, config: { kind: 'success', text: 'Dòng 2' } },
    ]
    const edges = [{ from: 'n1', to: 'n2' }, { from: 'n2', to: 'n3', branch: 'true' as const }]
    const table = node('t', 'Table', { entity: 'Product', columns: ['name'], actions: [] }, { events: { onRowClick: 'wf1' } })
    const root = await mount(project([table], { workflows: wf(nodes, edges) }))
    await click(root.querySelectorAll('tbody tr')[1])
    expect(root.querySelector('.rp-toast')?.textContent).toBe('Dòng 2')
  })
})

describe('quan hệ ref (shopSample)', () => {
  const shop = (components: ComponentNode[]): ProjectSchema => ({ ...structuredClone(shopSample), pages: [{ id: 'p1', route: '/', title: 'Home', requireRole: [], components }] })

  it('Table hiện nhãn của bản ghi liên quan ở cột ref', async () => {
    const root = await mount(shop([node('t', 'Table', { entity: 'Order', columns: ['customer', 'status'] })]))
    expect(text(root, 'thead th').slice(0, 2)).toEqual(['customer', 'status'])
    expect(root.querySelector('tbody tr td')?.textContent).toBe('Customer 1')
  })

  it('Form vẽ ô chọn bản ghi liên quan với nhãn mẫu và bắt buộc chọn nếu required', async () => {
    const root = await mount(shop([node('f', 'Form', { entity: 'Order' })]))
    const select = [...root.querySelectorAll<HTMLSelectElement>('.rp-form select')].find((s) => s.textContent?.includes('Customer 1'))!
    expect([...select.options].map((o) => o.textContent)).toEqual(['-- chọn Customer --', 'Customer 1', 'Customer 2', 'Customer 3', 'Customer 4', 'Customer 5'])
    await act(async () => root.querySelector('form')!.requestSubmit())
    expect(text(root, '.rp-error').length).toBeGreaterThan(0)
  })
})
