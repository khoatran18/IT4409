import { createEmptyProject, type ProjectSchema } from '@codeflow/schema'
import { describe, expect, it } from 'vitest'
import '../registry'
import {
  addComponent,
  findComponent,
  isSelfOrDescendant,
  moveComponent,
  nextComponentId,
  removeComponent,
  resetProps,
  updateProps,
} from './operations'
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

/** c1 Container { c2 Button, c3 Container { c4 Text } }, c5 Text, c6 Button (gốc: c1, c5, c6) */
function tree(): ProjectSchema {
  let p = project()
  p = addComponent(p, 'p1', null, 'Container').project
  p = addComponent(p, 'p1', 'c1', 'Button').project
  p = addComponent(p, 'p1', 'c1', 'Container').project
  p = addComponent(p, 'p1', 'c3', 'Text').project
  p = addComponent(p, 'p1', null, 'Text').project
  p = addComponent(p, 'p1', null, 'Button').project
  return p
}

const rootIds = (p: ProjectSchema) => p.pages[0].components.map((c) => c.id)
const childIds = (p: ProjectSchema, id: string) => findComponent(p, id)?.children?.map((c) => c.id)

describe('addComponent với index', () => {
  it('chèn đúng vị trí, index vượt biên thì kẹp về hai đầu', () => {
    const p = tree()
    expect(rootIds(addComponent(p, 'p1', null, 'Text', 1).project)).toEqual(['c1', 'c7', 'c5', 'c6'])
    expect(rootIds(addComponent(p, 'p1', null, 'Text', 99).project)).toEqual(['c1', 'c5', 'c6', 'c7'])
    expect(childIds(addComponent(p, 'p1', 'c1', 'Text', -5).project, 'c1')).toEqual(['c7', 'c2', 'c3'])
  })
})

describe('moveComponent', () => {
  it('đổi thứ tự trong cùng cha: khe tính trước khi bỏ node ra', () => {
    const p = tree()
    expect(rootIds(moveComponent(p, 'c1', 'p1', null, 3))).toEqual(['c5', 'c6', 'c1'])
    expect(rootIds(moveComponent(p, 'c6', 'p1', null, 0))).toEqual(['c6', 'c1', 'c5'])
    expect(rootIds(moveComponent(p, 'c1', 'p1', null, 2))).toEqual(['c5', 'c1', 'c6'])
  })

  it('thả sát chính nó (khe trước hoặc sau) không đổi thứ tự', () => {
    const p = tree()
    expect(rootIds(moveComponent(p, 'c5', 'p1', null, 1))).toEqual(['c1', 'c5', 'c6'])
    expect(rootIds(moveComponent(p, 'c5', 'p1', null, 2))).toEqual(['c1', 'c5', 'c6'])
  })

  it('chuyển sang container khác, từ container ra gốc, và vào container lồng sâu', () => {
    const p = tree()
    const a = moveComponent(p, 'c5', 'p1', 'c3', 0)
    expect(childIds(a, 'c3')).toEqual(['c5', 'c4'])
    expect(rootIds(a)).toEqual(['c1', 'c6'])

    const b = moveComponent(p, 'c4', 'p1', null, 1)
    expect(rootIds(b)).toEqual(['c1', 'c4', 'c5', 'c6'])
    expect(childIds(b, 'c3')).toEqual([])

    const c = moveComponent(p, 'c6', 'p1', 'c3', 1)
    expect(childIds(c, 'c3')).toEqual(['c4', 'c6'])
  })

  it('di chuyển cả container kèm con', () => {
    const next = moveComponent(tree(), 'c3', 'p1', null, 0)
    expect(rootIds(next)).toEqual(['c3', 'c1', 'c5', 'c6'])
    expect(childIds(next, 'c3')).toEqual(['c4'])
    expect(childIds(next, 'c1')).toEqual(['c2'])
  })

  it('từ chối thả container vào chính nó hoặc hậu duệ', () => {
    const p = tree()
    expect(moveComponent(p, 'c1', 'p1', 'c1', 0)).toBe(p)
    expect(moveComponent(p, 'c1', 'p1', 'c3', 0)).toBe(p)
    expect(moveComponent(p, 'c3', 'p1', 'c3', 0)).toBe(p)
  })

  it('từ chối id/đích không tồn tại, đích không phải Container, không đổi project gốc', () => {
    const p = tree()
    const snapshot = JSON.stringify(p)
    expect(moveComponent(p, 'zz', 'p1', null, 0)).toBe(p)
    expect(moveComponent(p, 'c5', 'p1', 'zz', 0)).toBe(p)
    expect(moveComponent(p, 'c5', 'p1', 'c6', 0)).toBe(p)
    expect(moveComponent(p, 'c5', 'nope', null, 0)).toBe(p)
    moveComponent(p, 'c5', 'p1', 'c3', 0)
    expect(JSON.stringify(p)).toBe(snapshot)
  })

  it('index vượt biên được kẹp', () => {
    const p = tree()
    expect(childIds(moveComponent(p, 'c5', 'p1', 'c1', 99), 'c1')).toEqual(['c2', 'c3', 'c5'])
    expect(childIds(moveComponent(p, 'c5', 'p1', 'c1', -3), 'c1')).toEqual(['c5', 'c2', 'c3'])
  })

  it('isSelfOrDescendant', () => {
    const p = tree()
    expect(isSelfOrDescendant(p, 'c1', 'c4')).toBe(true)
    expect(isSelfOrDescendant(p, 'c1', 'c1')).toBe(true)
    expect(isSelfOrDescendant(p, 'c3', 'c2')).toBe(false)
    expect(isSelfOrDescendant(p, 'zz', 'c1')).toBe(false)
  })
})

describe('resetProps', () => {
  it('bỏ prop để quay về default', () => {
    const a = addComponent(project(), 'p1', null, 'Button')
    const changed = updateProps(a.project, 'c1', { text: 'Lưu', disabled: true })
    expect(findComponent(resetProps(changed, 'c1', ['text']), 'c1')?.props).toEqual({ variant: 'primary', disabled: true })
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

  it('move và resetProps cập nhật project', () => {
    useSchemaStore.getState().load(tree())
    const { move, setProps, resetProps: reset } = useSchemaStore.getState()
    move('c5', 'p1', 'c1', 0)
    expect(childIds(useSchemaStore.getState().project, 'c1')?.[0]).toBe('c5')
    const before = useSchemaStore.getState().project
    move('c1', 'p1', 'c4', 0)
    expect(useSchemaStore.getState().project).toBe(before)
    setProps('c6', { text: 'X' })
    reset('c6', ['text'])
    expect(findComponent(useSchemaStore.getState().project, 'c6')?.props).toEqual({ variant: 'primary', disabled: false })
  })
})
