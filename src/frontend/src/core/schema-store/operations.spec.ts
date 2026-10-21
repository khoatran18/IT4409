import { createEmptyProject, type ProjectSchema } from '@codeflow/schema'
import { describe, expect, it } from 'vitest'
import '../registry'
import { addComponent, findComponent, nextComponentId, removeComponent, updateProps } from './operations'
import { useSchemaStore } from './store'

function project(): ProjectSchema {
  return {
    ...createEmptyProject('t'),
    pages: [{ id: 'p1', route: '/', title: 'Home', requireRole: [], components: [] }],
  }
}

describe('schema-store operations', () => {
  it('thêm component vào page với default props và id duy nhất', () => {
    const a = addComponent(project(), 'p1', null, 'Button')
    const b = addComponent(a.project, 'p1', null, 'Text')
    expect(a.id).toBe('c1')
    expect(b.id).toBe('c2')
    expect(b.project.pages[0].components.map((c) => c.id)).toEqual(['c1', 'c2'])
    expect(findComponent(b.project, 'c1')?.props).toMatchObject({ text: 'Button', variant: 'primary' })
  })

  it('thêm vào Container lồng nhau, id không trùng', () => {
    const a = addComponent(project(), 'p1', null, 'Container')
    const b = addComponent(a.project, 'p1', a.id, 'Container')
    const c = addComponent(b.project, 'p1', b.id, 'Button')
    expect(findComponent(c.project, 'c2')?.children?.map((n) => n.id)).toEqual(['c3'])
    expect(nextComponentId(c.project)).toBe('c4')
  })

  it('từ chối thêm vào component không phải Container, type lạ, page lạ', () => {
    const a = addComponent(project(), 'p1', null, 'Button')
    expect(addComponent(a.project, 'p1', a.id, 'Text').id).toBeNull()
    expect(addComponent(a.project, 'p1', null, 'Nope').id).toBeNull()
    expect(addComponent(a.project, 'zz', null, 'Text').id).toBeNull()
  })

  it('xóa component kể cả con, không đổi project gốc', () => {
    const a = addComponent(project(), 'p1', null, 'Container')
    const b = addComponent(a.project, 'p1', a.id, 'Text')
    const removed = removeComponent(b.project, 'c1')
    expect(removed.pages[0].components).toEqual([])
    expect(b.project.pages[0].components).toHaveLength(1)
  })

  it('cập nhật props bằng cách gộp', () => {
    const a = addComponent(project(), 'p1', null, 'Button')
    const next = updateProps(a.project, 'c1', { text: 'Lưu' })
    expect(findComponent(next, 'c1')?.props).toMatchObject({ text: 'Lưu', variant: 'primary' })
  })
})

describe('useSchemaStore', () => {
  it('thêm thì chọn component mới; xóa component đang chọn thì bỏ chọn', () => {
    const { add, remove, select } = useSchemaStore.getState()
    add('p1', null, 'Button')
    expect(useSchemaStore.getState().selectedId).toBe('c1')
    select('c1')
    remove('c1')
    expect(useSchemaStore.getState().selectedId).toBeNull()
  })
})
