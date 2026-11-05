// @vitest-environment jsdom
import { inventorySample, type ComponentNode, type Page, type ProjectSchema } from '@codeflow/schema'
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

  it('workflow ngoài navigate hoặc không tồn tại thì báo chưa hỗ trợ', async () => {
    const callApi = { id: 'go-admin', nodes: [{ id: 'n1', type: 'callApi' as const, config: {} }], edges: [] }
    const root = await mount(multi([callApi]))
    await click(root.querySelector('.rp-button'))
    expect(root.querySelector('.rp-toast')?.textContent).toBe('Workflow chưa hỗ trợ trong preview')

    const missing = await mount(multi([]))
    await click(missing.querySelector('.rp-button'))
    expect(missing.querySelector('.rp-toast')?.textContent).toContain('không tồn tại')
  })

  it('project không có page nào vẫn vẽ được', async () => {
    const root = await mount({ ...multi(), pages: [] })
    expect(root.textContent).toContain('chưa có trang nào')
  })
})
