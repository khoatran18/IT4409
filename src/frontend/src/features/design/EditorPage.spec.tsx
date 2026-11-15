// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { schoolAdminSample } from '@codeflow/schema'
import { initialProject, useSchemaStore } from '../../core/schema-store'
import { EditorPage } from './EditorPage'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const mounted: Root[] = []

async function renderEditor(): Promise<HTMLElement> {
  const container = document.createElement('div')
  const root = createRoot(container)
  mounted.push(root)
  await act(async () => root.render(<EditorPage />))
  return container
}

function setValue(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, value: string): void {
  const proto = el instanceof HTMLSelectElement ? HTMLSelectElement : el instanceof HTMLTextAreaElement ? HTMLTextAreaElement : HTMLInputElement
  Object.getOwnPropertyDescriptor(proto.prototype, 'value')!.set!.call(el, value)
  el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }))
}

const node = (id: string) => useSchemaStore.getState().project.pages[0].components.find((c) => c.id === id)

describe('EditorPage (render trong jsdom, chưa kiểm thử kéo thả bằng trình duyệt)', () => {
  beforeEach(() => {
    useSchemaStore.getState().load(initialProject())
  })

  afterEach(async () => {
    await act(async () => mounted.splice(0).forEach((root) => root.unmount()))
    document.body.replaceChildren()
  })

  it('palette liệt kê component từ registry, nhóm theo category', async () => {
    const root = await renderEditor()
    const items = [...root.querySelectorAll('.palette-item')].map((el) => el.textContent)
    expect(items.sort()).toEqual(['Button', 'Card', 'Checkbox', 'Container', 'Form', 'Heading', 'Input', 'Select', 'Table', 'Text'])
    expect([...root.querySelectorAll('.palette-group')].map((el) => el.textContent)).toEqual(['Layout', 'Basic', 'Data'])
  })

  it('tìm kiếm lọc palette', async () => {
    const root = await renderEditor()
    await act(async () => setValue(root.querySelector<HTMLInputElement>('.palette-search')!, 'tab'))
    expect([...root.querySelectorAll('.palette-item')].map((el) => el.textContent)).toEqual(['Table'])
  })

  it('canvas vẽ component lồng trong Container và chọn thì highlight', async () => {
    const { add } = useSchemaStore.getState()
    act(() => {
      add('p1', null, 'Container')
      add('p1', 'c1', 'Button')
    })
    const root = await renderEditor()
    expect(root.querySelector('.pv-container .pv-button')?.textContent).toBe('Button')
    expect(root.querySelector('.node.selected')).not.toBeNull()

    await act(async () => root.querySelector<HTMLElement>('.canvas')!.click())
    expect(root.querySelector('.node.selected')).toBeNull()
  })

  it('Properties: sửa prop ghi vào store và canvas cập nhật ngay', async () => {
    act(() => useSchemaStore.getState().add('p1', null, 'Button'))
    const root = await renderEditor()
    const input = root.querySelector<HTMLInputElement>('#prop-text')!
    expect(input.placeholder).toBe('Button')
    await act(async () => setValue(input, 'Lưu'))
    expect(node('c1')?.props.text).toBe('Lưu')
    expect(root.querySelector('.pv-button')?.textContent).toBe('Lưu')

    await act(async () => setValue(root.querySelector<HTMLSelectElement>('#prop-variant')!, 'secondary'))
    expect(node('c1')?.props.variant).toBe('secondary')
    await act(async () => root.querySelector<HTMLInputElement>('#prop-disabled')!.click())
    expect(node('c1')?.props.disabled).toBe(true)
  })

  it('Properties: Khôi phục mặc định bỏ prop khỏi schema', async () => {
    act(() => {
      useSchemaStore.getState().add('p1', null, 'Button')
      useSchemaStore.getState().setProps('c1', { text: 'Lưu' })
    })
    const root = await renderEditor()
    await act(async () => root.querySelector<HTMLButtonElement>('.prop-reset')!.click())
    expect(node('c1')?.props).not.toHaveProperty('text')
    expect(root.querySelector('.pv-button')?.textContent).toBe('Button')
    expect(root.querySelector('.prop-reset')).toBeNull()
  })

  it('Properties: Table báo bắt buộc, chọn entity thì liệt kê field để chọn cột', async () => {
    act(() => {
      useSchemaStore.getState().load({ ...structuredClone(schoolAdminSample), pages: [{ id: 'p1', route: '/', title: 'T', requireRole: [], components: [] }] })
      useSchemaStore.getState().add('p1', null, 'Table')
    })
    const root = await renderEditor()
    expect([...root.querySelectorAll('.prop-error')].map((e) => e.textContent)).toEqual(['bắt buộc', 'bắt buộc'])
    expect(root.querySelector('.node-warn')?.textContent).toContain('entity')

    await act(async () => setValue(root.querySelector<HTMLSelectElement>('#prop-entity')!, 'Student'))
    expect(node('c1')?.props.entity).toBe('Student')
    const boxes = [...root.querySelectorAll<HTMLInputElement>('.prop-checks input')]
    expect(boxes.map((b) => b.parentElement?.textContent)).toContain('email')

    const emailBox = boxes.find((b) => b.parentElement?.textContent === 'email')!
    await act(async () => emailBox.click())
    expect(node('c1')?.props.columns).toEqual(['email'])
    expect(root.querySelector('.node-warn')).toBeNull()
    expect(root.querySelector('.pv-table th')?.textContent).toBe('email')

    await act(async () => setValue(root.querySelector<HTMLSelectElement>('#prop-entity')!, ''))
    expect(node('c1')?.props).not.toHaveProperty('columns')
  })

  it('phím Delete xóa component đang chọn, nhưng không khi đang gõ trong input', async () => {
    act(() => {
      useSchemaStore.getState().add('p1', null, 'Button')
      useSchemaStore.getState().add('p1', null, 'Text')
    })
    const root = await renderEditor()
    document.body.append(root)
    const input = root.querySelector<HTMLInputElement>('#prop-content')!
    await act(async () => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true })))
    expect(node('c2')).toBeDefined()

    await act(async () => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true })))
    expect(node('c2')).toBeUndefined()
    expect(node('c1')).toBeDefined()
  })

  it('Form vẽ các field của entity', async () => {
    act(() => {
      useSchemaStore.getState().load({ ...structuredClone(schoolAdminSample), pages: [{ id: 'p1', route: '/', title: 'T', requireRole: [], components: [] }] })
      useSchemaStore.getState().add('p1', null, 'Form')
      useSchemaStore.getState().setProps('c1', { entity: 'Student' })
    })
    const root = await renderEditor()
    expect([...root.querySelectorAll('.pv-form .pv-field span')].map((e) => e.textContent)).toEqual(['name', 'email', 'age'])
  })

  describe('quản lý trang', () => {
    const project = () => useSchemaStore.getState().project
    const button = (root: HTMLElement, label: string) => root.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!

    it('thêm trang mới, chọn nó và canvas chuyển sang trang đó', async () => {
      const root = await renderEditor()
      await act(async () =>
        [...root.querySelectorAll('button')].find((b) => b.textContent === 'Thêm trang')!.click(),
      )
      expect(project().pages.map((p) => p.id)).toEqual(['p1', 'p2'])
      expect([...root.querySelectorAll('.page-item')].map((el) => el.classList.contains('page-current'))).toEqual([false, true])
      expect(root.querySelector<HTMLInputElement>('#page-route')!.value).toBe('/trang-2')
    })

    it('đổi route: route sai bị từ chối và hiện lỗi, route đúng được ghi vào schema', async () => {
      const root = await renderEditor()
      const route = root.querySelector<HTMLInputElement>('#page-route')!
      await act(async () => setValue(route, 'khong-co-slash'))
      await act(async () => route.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })))
      expect(root.querySelector('[role="alert"]')?.textContent).toContain('bắt đầu')
      expect(project().pages[0].route).toBe('/')

      await act(async () => setValue(root.querySelector<HTMLInputElement>('#page-route')!, '/home'))
      await act(async () =>
        root.querySelector('#page-route')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })),
      )
      expect(project().pages[0].route).toBe('/home')
      expect(root.querySelector('[role="alert"]')).toBeNull()
    })

    it('chọn role được xem lấy từ roles của schema', async () => {
      act(() => useSchemaStore.getState().load(structuredClone(schoolAdminSample)))
      const root = await renderEditor()
      const boxes = [...root.querySelectorAll<HTMLInputElement>('.page-settings .prop-checks input')]
      expect(boxes.map((b) => b.parentElement?.textContent)).toEqual(['admin', 'user'])
      await act(async () => boxes[0].click())
      expect(project().pages[0].requireRole).toEqual(['user'])
    })

    it('trang cuối cùng không xóa được; có nhiều trang thì xóa và đổi thứ tự được', async () => {
      const root = await renderEditor()
      await act(async () => button(root, 'Xóa Trang chủ').click())
      expect(project().pages).toHaveLength(1)
      expect(root.querySelector('[role="alert"]')?.textContent).toContain('ít nhất một trang')

      await act(async () => [...root.querySelectorAll('button')].find((b) => b.textContent === 'Thêm trang')!.click())
      await act(async () => button(root, 'Đưa Trang mới lên').click())
      expect(project().pages.map((p) => p.id)).toEqual(['p2', 'p1'])
      await act(async () => button(root, 'Xóa Trang mới').click())
      expect(project().pages.map((p) => p.id)).toEqual(['p1'])
    })

    it('Tạo trang từ entity thả sẵn Heading + Table + Button', async () => {
      act(() => useSchemaStore.getState().load(structuredClone(schoolAdminSample)))
      const root = await renderEditor()
      await act(async () => [...root.querySelectorAll('button')].find((b) => b.textContent === 'Tạo trang')!.click())
      const created = project().pages.at(-1)!
      expect(created.title).toBe('Danh sách Student')
      expect(created.components.map((c) => c.type)).toEqual(['Heading', 'Table', 'Button'])
      expect(root.querySelector('.pv-table th')?.textContent).toBe('name')
    })
  })

  describe('chế độ xem trước', () => {
    it('chuyển Thiết kế <-> Xem trước và vẽ UI thật từ schema', async () => {
      act(() => useSchemaStore.getState().load(structuredClone(schoolAdminSample)))
      const root = await renderEditor()
      const tab = (label: string) => [...root.querySelectorAll('button')].find((b) => b.textContent === label)!
      expect(root.querySelector('.rp-app')).toBeNull()

      await act(async () => tab('Xem trước').click())
      expect(root.querySelector('.palette-item')).toBeNull()
      expect(root.querySelectorAll('.rp-app tbody tr').length).toBe(10)
      expect([...root.querySelectorAll('.rp-nav')].map((b) => b.textContent)).toEqual(['Sinh viên'])

      await act(async () => tab('Thiết kế').click())
      expect(root.querySelector('.rp-app')).toBeNull()
      expect(root.querySelector('.palette-item')).not.toBeNull()
    })
  })
})
