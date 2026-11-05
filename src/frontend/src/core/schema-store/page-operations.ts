import type { ComponentNode, Page, ProjectSchema, Workflow } from '@codeflow/schema'
import { defaultProps } from '../registry'
import { nextComponentId } from './operations'

export interface PageResult {
  project: ProjectSchema
  /** Id của page vừa tạo */
  id?: string
  /** Có lỗi thì project được trả về nguyên vẹn */
  error?: string
}

export type PageKind = 'list' | 'form'

function reject(project: ProjectSchema, error: string): PageResult {
  return { project, error }
}

function nextNumber(ids: string[], prefix: string): number {
  let max = 0
  for (const id of ids) {
    const match = new RegExp(`^${prefix}(\\d+)$`).exec(id)
    if (match) max = Math.max(max, Number(match[1]))
  }
  return max + 1
}

/** null nếu route hợp lệ; `exceptPageId` là page đang được sửa (không tính là trùng với chính nó). */
export function validateRoute(project: ProjectSchema, route: string, exceptPageId?: string): string | null {
  if (!route.startsWith('/')) return 'Route phải bắt đầu bằng "/"'
  if (/\s/.test(route)) return 'Route không được chứa khoảng trắng'
  if (project.pages.some((p) => p.id !== exceptPageId && p.route === route)) return `Route "${route}" đã được dùng`
  return null
}

function uniqueRoute(project: ProjectSchema, base: string): string {
  let route = base
  for (let i = 2; validateRoute(project, route) !== null; i++) route = `${base}-${i}`
  return route
}

function mapNavigation(project: ProjectSchema, from: string, to: string): ProjectSchema {
  const workflows = project.workflows.map((wf) => ({
    ...wf,
    nodes: wf.nodes.map((node) =>
      node.type === 'navigate' && node.config.to === from ? { ...node, config: { ...node.config, to } } : node,
    ),
  }))
  return { ...project, workflows }
}

function countNavigation(project: ProjectSchema, route: string): number {
  return project.workflows.flatMap((wf) => wf.nodes).filter((n) => n.type === 'navigate' && n.config.to === route).length
}

function updatePage(project: ProjectSchema, id: string, patch: Partial<Page>): ProjectSchema {
  return { ...project, pages: project.pages.map((p) => (p.id === id ? { ...p, ...patch } : p)) }
}

export function addPage(project: ProjectSchema, title = 'Trang mới'): PageResult {
  const n = nextNumber(project.pages.map((p) => p.id), 'p')
  const page: Page = { id: `p${n}`, route: uniqueRoute(project, `/trang-${n}`), title, requireRole: [], components: [] }
  return { project: { ...project, pages: [...project.pages, page] }, id: page.id }
}

/** Luôn giữ lại ít nhất một page. */
export function removePage(project: ProjectSchema, id: string): PageResult & { dangling: number } {
  const page = project.pages.find((p) => p.id === id)
  if (!page) return { ...reject(project, 'Không tìm thấy trang'), dangling: 0 }
  if (project.pages.length === 1) return { ...reject(project, 'Phải còn ít nhất một trang'), dangling: 0 }
  return {
    project: { ...project, pages: project.pages.filter((p) => p.id !== id) },
    dangling: countNavigation(project, page.route),
  }
}

export function renamePage(project: ProjectSchema, id: string, title: string): PageResult {
  if (!project.pages.some((p) => p.id === id)) return reject(project, 'Không tìm thấy trang')
  if (title.trim() === '') return reject(project, 'Tên trang không được để trống')
  return { project: updatePage(project, id, { title: title.trim() }) }
}

/** Đổi route và cập nhật các node navigate đang trỏ tới route cũ. */
export function setRoute(project: ProjectSchema, id: string, route: string): PageResult {
  const page = project.pages.find((p) => p.id === id)
  if (!page) return reject(project, 'Không tìm thấy trang')
  const error = validateRoute(project, route, id)
  if (error) return reject(project, error)
  if (route === page.route) return { project }
  return { project: mapNavigation(updatePage(project, id, { route }), page.route, route) }
}

export function setRequireRole(project: ProjectSchema, id: string, roles: string[]): PageResult {
  if (!project.pages.some((p) => p.id === id)) return reject(project, 'Không tìm thấy trang')
  const valid = project.roles.filter((role) => roles.includes(role))
  return { project: updatePage(project, id, { requireRole: valid }) }
}

/** Đổi vị trí page trong menu. Ở đầu/cuối danh sách thì trả về project cũ. */
export function movePage(project: ProjectSchema, id: string, direction: 'up' | 'down'): ProjectSchema {
  const index = project.pages.findIndex((p) => p.id === id)
  const target = direction === 'up' ? index - 1 : index + 1
  if (index < 0 || target < 0 || target >= project.pages.length) return project
  const pages = [...project.pages]
  ;[pages[index], pages[target]] = [pages[target], pages[index]]
  return { ...project, pages }
}

const IRREGULAR: Record<string, string> = { person: 'people', child: 'children', man: 'men', woman: 'women' }

/** Giống `pluralKebab` mà generator dùng cho đường dẫn API và route trang entity. */
export function pluralKebab(name: string): string {
  const words = name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase())
  const last = words.pop() ?? ''
  const plural = IRREGULAR[last] ?? (/(s|x|z|ch|sh)$/.test(last) ? `${last}es` : /[^aeiou]y$/.test(last) ? `${last.slice(0, -1)}ies` : `${last}s`)
  return [...words, plural].join('-')
}

function node(id: number, type: string, props: Record<string, unknown>, events?: Record<string, string>): ComponentNode {
  const result: ComponentNode = { id: `c${id}`, type, props: { ...defaultProps(type), ...props } }
  return events ? { ...result, events } : result
}

/** Tạo page từ entity: List (Heading + Table + nút Thêm trỏ tới trang Form) hoặc Form (Heading + Form). */
export function createPageFromEntity(project: ProjectSchema, entityName: string, kind: PageKind): PageResult {
  const entity = project.entities.find((e) => e.name === entityName)
  if (!entity) return reject(project, `Không có entity "${entityName}"`)

  const pageNumber = nextNumber(project.pages.map((p) => p.id), 'p')
  const first = Number(nextComponentId(project).slice(1))
  const listRoute = `/${pluralKebab(entity.name)}`

  if (kind === 'form') {
    const route = uniqueRoute(project, `${listRoute}/new`)
    const title = `Thêm ${entity.name}`
    const components = [
      node(first, 'Heading', { text: title }),
      node(first + 1, 'Form', { entity: entity.name, mode: 'create' }),
    ]
    const page: Page = { id: `p${pageNumber}`, route, title, requireRole: [], components }
    return { project: { ...project, pages: [...project.pages, page] }, id: page.id }
  }

  const route = uniqueRoute(project, listRoute)
  const title = `Danh sách ${entity.name}`
  const workflow: Workflow = {
    id: `wf${nextNumber(project.workflows.map((w) => w.id), 'wf')}`,
    nodes: [{ id: 'n1', type: 'navigate', config: { to: `${route}/new` } }],
    edges: [],
  }
  const components = [
    node(first, 'Heading', { text: title }),
    node(first + 1, 'Table', { entity: entity.name, columns: entity.fields.map((f) => f.name) }),
    node(first + 2, 'Button', { text: `Thêm ${entity.name}` }, { onClick: workflow.id }),
  ]
  const page: Page = { id: `p${pageNumber}`, route, title, requireRole: [], components }
  return { project: { ...project, pages: [...project.pages, page], workflows: [...project.workflows, workflow] }, id: page.id }
}
