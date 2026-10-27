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
})
