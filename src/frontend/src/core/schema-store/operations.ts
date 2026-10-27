import type { ComponentNode, Page, ProjectSchema } from '@codeflow/schema'
import { defaultProps, get } from '../registry'

function walk(nodes: ComponentNode[], visit: (node: ComponentNode) => void): void {
  for (const node of nodes) {
    visit(node)
    if (node.children) walk(node.children, visit)
  }
}

function mapTree(nodes: ComponentNode[], fn: (node: ComponentNode) => ComponentNode): ComponentNode[] {
  return nodes.map((node) => {
    const next = fn(node)
    return next.children ? { ...next, children: mapTree(next.children, fn) } : next
  })
}

function mapPages(project: ProjectSchema, fn: (page: Page) => Page): ProjectSchema {
  return { ...project, pages: project.pages.map(fn) }
}

export function nextComponentId(project: ProjectSchema): string {
  let max = 0
  for (const page of project.pages) {
    walk(page.components, (node) => {
      const match = /^c(\d+)$/.exec(node.id)
      if (match) max = Math.max(max, Number(match[1]))
    })
  }
  return `c${max + 1}`
}

export function findComponent(project: ProjectSchema, id: string): ComponentNode | undefined {
  let found: ComponentNode | undefined
  for (const page of project.pages) walk(page.components, (node) => (found ??= node.id === id ? node : undefined))
  return found
}

function insertAt<T>(items: T[], index: number | undefined, item: T): T[] {
  const at = index === undefined ? items.length : Math.min(Math.max(index, 0), items.length)
  return [...items.slice(0, at), item, ...items.slice(at)]
}

/** Chèn node vào page (parentId = null) hoặc vào một Container. Trả về null nếu đích không hợp lệ. */
function insertNode(
  project: ProjectSchema,
  pageId: string,
  parentId: string | null,
  index: number | undefined,
  node: ComponentNode,
): ProjectSchema | null {
  if (parentId === null) {
    if (!project.pages.some((p) => p.id === pageId)) return null
    return mapPages(project, (p) => (p.id === pageId ? { ...p, components: insertAt(p.components, index, node) } : p))
  }
  const parent = findComponent(project, parentId)
  if (!parent || !get(parent.type)?.container) return null
  return mapPages(project, (p) => ({
    ...p,
    components: mapTree(p.components, (n) =>
      n.id === parentId ? { ...n, children: insertAt(n.children ?? [], index, node) } : n,
    ),
  }))
}

/** Thêm component vào page (parentId = null) hoặc vào một Container, mặc định ở cuối. Trả về project không đổi nếu đích không hợp lệ. */
export function addComponent(
  project: ProjectSchema,
  pageId: string,
  parentId: string | null,
  type: string,
  index?: number,
): { project: ProjectSchema; id: string | null } {
  if (!get(type)) return { project, id: null }
  const node: ComponentNode = { id: nextComponentId(project), type, props: defaultProps(type) }
  if (get(type)?.container) node.children = []
  const next = insertNode(project, pageId, parentId, index, node)
  return next ? { project: next, id: node.id } : { project, id: null }
}

interface Location {
  pageId: string
  parentId: string | null
  index: number
  node: ComponentNode
}

function locate(project: ProjectSchema, id: string): Location | undefined {
  function search(nodes: ComponentNode[], pageId: string, parentId: string | null): Location | undefined {
    for (const [index, node] of nodes.entries()) {
      if (node.id === id) return { pageId, parentId, index, node }
      const inner = node.children && search(node.children, pageId, node.id)
      if (inner) return inner
    }
  }
  for (const page of project.pages) {
    const found = search(page.components, page.id, null)
    if (found) return found
  }
}

/** `ancestorId` là chính `id` hoặc tổ tiên của `id` (dùng để chặn thả container vào hậu duệ của nó). */
export function isSelfOrDescendant(project: ProjectSchema, ancestorId: string, id: string): boolean {
  const ancestor = findComponent(project, ancestorId)
  if (!ancestor) return false
  let found = false
  walk([ancestor], (n) => (found ||= n.id === id))
  return found
}

/**
 * Di chuyển component sang `parentId` (null = gốc page `pageId`) tại vị trí `index`.
 * `index` là khe trong danh sách con TRƯỚC khi bỏ node ra (khe 0 = trước phần tử đầu, n = cuối),
 * nên kéo trong cùng cha sẽ tự trừ 1 khi node nằm trước khe. Đích không hợp lệ thì trả về project cũ.
 */
export function moveComponent(
  project: ProjectSchema,
  id: string,
  pageId: string,
  parentId: string | null,
  index: number,
): ProjectSchema {
  const from = locate(project, id)
  if (!from) return project
  if (parentId !== null && isSelfOrDescendant(project, id, parentId)) return project

  let at = index
  if (from.pageId === pageId && from.parentId === parentId && from.index < index) at -= 1
  const next = insertNode(removeComponent(project, id), pageId, parentId, at, from.node)
  return next ?? project
}

function filterTree(nodes: ComponentNode[], id: string): ComponentNode[] {
  return nodes
    .filter((n) => n.id !== id)
    .map((n) => (n.children ? { ...n, children: filterTree(n.children, id) } : n))
}

export function removeComponent(project: ProjectSchema, id: string): ProjectSchema {
  return mapPages(project, (p) => ({ ...p, components: filterTree(p.components, id) }))
}

export function updateProps(project: ProjectSchema, id: string, props: Record<string, unknown>): ProjectSchema {
  return mapPages(project, (p) => ({
    ...p,
    components: mapTree(p.components, (n) => (n.id === id ? { ...n, props: { ...n.props, ...props } } : n)),
  }))
}

/** Bỏ các prop khỏi node để quay về giá trị mặc định của registry. */
export function resetProps(project: ProjectSchema, id: string, names: string[]): ProjectSchema {
  return mapPages(project, (p) => ({
    ...p,
    components: mapTree(p.components, (n) => {
      if (n.id !== id) return n
      const props = { ...n.props }
      for (const name of names) delete props[name]
      return { ...n, props }
    }),
  }))
}
