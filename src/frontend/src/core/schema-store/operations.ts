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

/** Thêm component vào page (parentId = null) hoặc vào một Container. Trả về project không đổi nếu đích không hợp lệ. */
export function addComponent(
  project: ProjectSchema,
  pageId: string,
  parentId: string | null,
  type: string,
): { project: ProjectSchema; id: string | null } {
  if (!get(type)) return { project, id: null }
  const node: ComponentNode = { id: nextComponentId(project), type, props: defaultProps(type) }
  if (get(type)?.container) node.children = []

  if (parentId === null) {
    if (!project.pages.some((p) => p.id === pageId)) return { project, id: null }
    const next = mapPages(project, (p) => (p.id === pageId ? { ...p, components: [...p.components, node] } : p))
    return { project: next, id: node.id }
  }

  const parent = findComponent(project, parentId)
  if (!parent || !get(parent.type)?.container) return { project, id: null }
  const next = mapPages(project, (p) => ({
    ...p,
    components: mapTree(p.components, (n) => (n.id === parentId ? { ...n, children: [...(n.children ?? []), node] } : n)),
  }))
  return { project: next, id: node.id }
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
