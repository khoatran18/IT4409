import { inventorySample, schoolAdminSample, type ProjectSchema } from '@codeflow/schema'
import { describe, expect, it } from 'vitest'
import {
  addPage,
  createPageFromEntity,
  movePage,
  pluralKebab,
  removePage,
  renamePage,
  setRequireRole,
  setRoute,
  validateRoute,
} from './page-operations'

const school = (): ProjectSchema => structuredClone(schoolAdminSample)
const inventory = (): ProjectSchema => structuredClone(inventorySample)

describe('addPage / renamePage', () => {
  it('thêm page với id và route không trùng', () => {
    const first = addPage(school())
    expect(first.id).toBe('p2')
    const second = addPage(first.project)
    expect(second.id).toBe('p3')
    expect(second.project.pages.map((p) => p.route)).toEqual(['/students', '/trang-2', '/trang-3'])
  })

  it('đổi tên trim khoảng trắng, từ chối tên rỗng', () => {
    expect(renamePage(school(), 'p1', '  Sinh viên  ').project.pages[0].title).toBe('Sinh viên')
    const rejected = renamePage(school(), 'p1', '   ')
    expect(rejected.error).toBeDefined()
    expect(rejected.project.pages[0].title).toBe('Sinh viên')
  })
})

describe('removePage', () => {
  it('từ chối xóa page cuối cùng', () => {
    const project = school()
    const result = removePage(project, 'p1')
    expect(result.error).toBeDefined()
    expect(result.project).toBe(project)
  })

  it('xóa page và đếm tham chiếu navigate còn trỏ tới route đã xóa', () => {
    const project = inventory()
    const result = removePage(project, 'new-product')
    expect(result.project.pages.map((p) => p.id)).toEqual(['products'])
    expect(result.dangling).toBe(1)
  })
})

describe('setRoute / validateRoute', () => {
  it('route phải bắt đầu bằng "/", không có khoảng trắng và không trùng', () => {
    const project = inventory()
    expect(validateRoute(project, 'products')).toMatch(/bắt đầu/)
    expect(validateRoute(project, '/a b')).toMatch(/khoảng trắng/)
    expect(validateRoute(project, '/products/new')).toMatch(/đã được dùng/)
    expect(validateRoute(project, '/products', 'products')).toBeNull()
    expect(setRoute(project, 'new-product', '/products').error).toBeDefined()
  })

  it('đổi route cập nhật node navigate trỏ tới route cũ', () => {
    const result = setRoute(inventory(), 'new-product', '/products/add')
    expect(result.error).toBeUndefined()
    expect(result.project.pages[1].route).toBe('/products/add')
    expect(result.project.workflows[0].nodes[0].config.to).toBe('/products/add')
  })
})

describe('setRequireRole / movePage', () => {
  it('chỉ giữ role có trong schema, theo thứ tự của roles', () => {
    const result = setRequireRole(inventory(), 'products', ['manager', 'ghost', 'admin'])
    expect(result.project.pages[0].requireRole).toEqual(['admin', 'manager'])
  })

  it('đổi thứ tự menu; ở biên thì không đổi', () => {
    const project = inventory()
    expect(movePage(project, 'products', 'down').pages.map((p) => p.id)).toEqual(['new-product', 'products'])
    expect(movePage(project, 'products', 'up')).toBe(project)
    expect(movePage(project, 'new-product', 'down')).toBe(project)
  })
})

describe('createPageFromEntity', () => {
  it('List: Heading + Table(đủ cột) + nút Thêm gắn workflow navigate sang /new', () => {
    const result = createPageFromEntity(inventory(), 'Category', 'list')
    const page = result.project.pages.at(-1)!
    expect(page.route).toBe('/categories')
    expect(page.components.map((c) => c.type)).toEqual(['Heading', 'Table', 'Button'])
    expect(page.components[1].props).toMatchObject({ entity: 'Category', columns: ['title'], pageSize: 10 })
    const wfId = page.components[2].events?.onClick
    const wf = result.project.workflows.find((w) => w.id === wfId)
    expect(wf?.nodes[0]).toMatchObject({ type: 'navigate', config: { to: '/categories/new' } })
  })

  it('id component và workflow không trùng với cái đã có', () => {
    const project = school()
    const { project: next } = createPageFromEntity(project, 'Student', 'list')
    const ids = next.pages.flatMap((p) => p.components.map((c) => c.id))
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(next.workflows.map((w) => w.id)).size).toBe(next.workflows.length)
  })

  it('route đã có thì thêm hậu tố', () => {
    const result = createPageFromEntity(school(), 'Student', 'list')
    expect(result.project.pages.at(-1)!.route).toBe('/students-2')
  })

  it('Form: Heading + Form(entity, create)', () => {
    const result = createPageFromEntity(school(), 'Student', 'form')
    const page = result.project.pages.at(-1)!
    expect(page.route).toBe('/students/new')
    expect(page.components.map((c) => c.type)).toEqual(['Heading', 'Form'])
    expect(page.components[1].props).toMatchObject({ entity: 'Student', mode: 'create' })
  })

  it('entity không tồn tại thì báo lỗi', () => {
    const project = school()
    const result = createPageFromEntity(project, 'Nope', 'list')
    expect(result.error).toBeDefined()
    expect(result.project).toBe(project)
  })
})

describe('pluralKebab', () => {
  it.each([
    ['Student', 'students'],
    ['Category', 'categories'],
    ['OrderItem', 'order-items'],
    ['Box', 'boxes'],
    ['Person', 'people'],
  ])('%s -> %s', (name, expected) => expect(pluralKebab(name)).toBe(expected))
})
