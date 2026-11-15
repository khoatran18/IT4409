import type { ComponentNode, ProjectSchema, Workflow, WorkflowEdge, WorkflowNode } from '@codeflow/schema'
import { configErrors, defaultConfig, getNode } from '../registry'
import { pluralKebab } from './page-operations'

export interface WorkflowResult {
  project: ProjectSchema
  /** Id của workflow hoặc node vừa tạo */
  id?: string
  /** Có lỗi thì project được trả về nguyên vẹn */
  error?: string
}

export interface WorkflowIssue {
  message: string
  nodeId?: string
  /** Prop của node bị lỗi, dùng để tô đỏ ô trong panel cấu hình */
  prop?: string
}

function reject(project: ProjectSchema, error: string): WorkflowResult {
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

function mapWorkflow(project: ProjectSchema, id: string, fn: (workflow: Workflow) => Workflow): ProjectSchema {
  return { ...project, workflows: project.workflows.map((w) => (w.id === id ? fn(w) : w)) }
}

function mapComponents(nodes: ComponentNode[], fn: (node: ComponentNode) => ComponentNode): ComponentNode[] {
  return nodes.map((node) => {
    const next = fn(node)
    return next.children ? { ...next, children: mapComponents(next.children, fn) } : next
  })
}

function mapAllComponents(project: ProjectSchema, fn: (node: ComponentNode) => ComponentNode): ProjectSchema {
  return { ...project, pages: project.pages.map((p) => ({ ...p, components: mapComponents(p.components, fn) })) }
}

export function addWorkflow(project: ProjectSchema): WorkflowResult {
  const id = `wf${nextNumber(project.workflows.map((w) => w.id), 'wf')}`
  return { project: { ...project, workflows: [...project.workflows, { id, nodes: [], edges: [] }] }, id }
}

/** Node với `events` mới; map rỗng thì bỏ hẳn khóa `events` cho schema gọn. */
function withEvents(node: ComponentNode, events: Record<string, string>): ComponentNode {
  const next: ComponentNode = { ...node }
  if (Object.keys(events).length > 0) next.events = events
  else delete next.events
  return next
}

/** Xóa workflow và gỡ nó khỏi các sự kiện component đang dùng. */
export function removeWorkflow(project: ProjectSchema, id: string): ProjectSchema {
  const cleaned = mapAllComponents(project, (node) => {
    const events = Object.fromEntries(Object.entries(node.events ?? {}).filter(([, wf]) => wf !== id))
    if (Object.keys(events).length === Object.keys(node.events ?? {}).length) return node
    return withEvents(node, events)
  })
  return { ...cleaned, workflows: cleaned.workflows.filter((w) => w.id !== id) }
}

/** Gắn (hoặc gỡ khi `workflowId` rỗng) workflow vào sự kiện của một component. */
export function setEvent(project: ProjectSchema, componentId: string, event: string, workflowId: string | undefined): ProjectSchema {
  return mapAllComponents(project, (node) => {
    if (node.id !== componentId) return node
    const events = { ...node.events }
    if (workflowId) events[event] = workflowId
    else delete events[event]
    return withEvents(node, events)
  })
}

export function addNode(project: ProjectSchema, workflowId: string, type: string): WorkflowResult {
  const workflow = project.workflows.find((w) => w.id === workflowId)
  if (!workflow) return reject(project, `Workflow "${workflowId}" không tồn tại`)
  if (!getNode(type)) return reject(project, `Loại node "${type}" chưa đăng ký`)
  const id = `n${nextNumber(workflow.nodes.map((n) => n.id), 'n')}`
  const node: WorkflowNode = { id, type: type as WorkflowNode['type'], config: defaultConfig(type) }
  return { project: mapWorkflow(project, workflowId, (w) => ({ ...w, nodes: [...w.nodes, node] })), id }
}

export function removeNode(project: ProjectSchema, workflowId: string, nodeId: string): ProjectSchema {
  return mapWorkflow(project, workflowId, (w) => ({
    ...w,
    nodes: w.nodes.filter((n) => n.id !== nodeId),
    edges: w.edges.filter((e) => e.from !== nodeId && e.to !== nodeId),
  }))
}

/** Gộp `patch` vào config của node; giá trị `undefined` hoặc chuỗi rỗng xóa khóa đó. */
export function updateNodeConfig(
  project: ProjectSchema,
  workflowId: string,
  nodeId: string,
  patch: Record<string, unknown>,
): ProjectSchema {
  return mapWorkflow(project, workflowId, (w) => ({
    ...w,
    nodes: w.nodes.map((n) => {
      if (n.id !== nodeId) return n
      const config = { ...n.config, ...patch }
      for (const key of Object.keys(patch)) if (config[key] === undefined || config[key] === '') delete config[key]
      return { ...n, config }
    }),
  }))
}

function sameEdge(a: WorkflowEdge, from: string, to: string, branch: string | undefined): boolean {
  return a.from === from && a.to === to && a.branch === branch
}

function reaches(edges: WorkflowEdge[], start: string, target: string): boolean {
  const seen = new Set<string>()
  const stack = [start]
  while (stack.length > 0) {
    const current = stack.pop()!
    if (current === target) return true
    if (seen.has(current)) continue
    seen.add(current)
    for (const edge of edges) if (edge.from === current) stack.push(edge.to)
  }
  return false
}

/**
 * Nối `from` -> `to`. Condition phải chỉ rõ nhánh, node khác không có nhánh.
 * Mỗi đầu ra (node, nhánh) chỉ có một cạnh nên nối lại sẽ thay cạnh cũ; mỗi node chỉ nhận một cạnh vào và không được tạo vòng.
 */
export function connect(
  project: ProjectSchema,
  workflowId: string,
  from: string,
  to: string,
  branch?: 'true' | 'false',
): WorkflowResult {
  const workflow = project.workflows.find((w) => w.id === workflowId)
  const source = workflow?.nodes.find((n) => n.id === from)
  if (!workflow || !source || !workflow.nodes.some((n) => n.id === to)) return reject(project, 'Node không tồn tại')
  if (from === to) return reject(project, 'Không nối node với chính nó')
  const hasBranches = Boolean(getNode(source.type)?.branches)
  if (hasBranches && !branch) return reject(project, 'Condition phải nối từ nhánh đúng hoặc sai')
  if (!hasBranches && branch) return reject(project, 'Chỉ Condition mới có nhánh')

  const kept = workflow.edges.filter((e) => !(e.from === from && e.branch === branch))
  if (kept.some((e) => sameEdge(e, from, to, branch))) return { project }
  if (kept.some((e) => e.to === to)) return reject(project, 'Node này đã có cạnh vào')
  if (reaches(kept, to, from)) return reject(project, 'Cạnh này tạo vòng lặp')
  const edge: WorkflowEdge = branch ? { from, to, branch } : { from, to }
  return { project: mapWorkflow(project, workflowId, (w) => ({ ...w, edges: [...kept, edge] })) }
}

export function disconnect(project: ProjectSchema, workflowId: string, from: string, to: string, branch?: 'true' | 'false'): ProjectSchema {
  return mapWorkflow(project, workflowId, (w) => ({ ...w, edges: w.edges.filter((e) => !sameEdge(e, from, to, branch)) }))
}

/** Các node không có cạnh vào. */
export function startNodes(workflow: Workflow): WorkflowNode[] {
  const targets = new Set(workflow.edges.map((e) => e.to))
  return workflow.nodes.filter((n) => !targets.has(n.id))
}

function outgoing(workflow: Workflow, id: string): WorkflowEdge[] {
  const edges = workflow.edges.filter((e) => e.from === id)
  // nhánh true đi trước false để thứ tự ổn định
  return edges.sort((a, b) => Number(b.branch === 'true') - Number(a.branch === 'true'))
}

/** Thứ tự thực thi từ node bắt đầu: đi theo cạnh, với condition thì nhánh true rồi tới false; node không với tới thì bỏ qua. */
export function executionOrder(workflow: Workflow): string[] {
  const start = startNodes(workflow)[0]
  const order: string[] = []
  const seen = new Set<string>()
  const visit = (id: string) => {
    if (seen.has(id)) return
    seen.add(id)
    order.push(id)
    for (const edge of outgoing(workflow, id)) visit(edge.to)
  }
  if (start) visit(start.id)
  return order
}

function hasCycle(workflow: Workflow): boolean {
  const state = new Map<string, 'open' | 'done'>()
  const visit = (id: string): boolean => {
    if (state.get(id) === 'done') return false
    if (state.get(id) === 'open') return true
    state.set(id, 'open')
    const cyclic = workflow.edges.filter((e) => e.from === id).some((e) => visit(e.to))
    state.set(id, 'done')
    return cyclic
  }
  return workflow.nodes.some((n) => visit(n.id))
}

/** Lỗi cấu trúc và cấu hình của workflow; mảng rỗng nghĩa là hợp lệ. `project` (tùy chọn) để kiểm entity tồn tại. */
export function validateWorkflow(workflow: Workflow, project?: ProjectSchema): WorkflowIssue[] {
  const issues: WorkflowIssue[] = []
  if (workflow.nodes.length === 0) return [{ message: 'Workflow chưa có node nào' }]

  const ids = new Set(workflow.nodes.map((n) => n.id))
  for (const edge of workflow.edges) {
    if (!ids.has(edge.from) || !ids.has(edge.to)) issues.push({ message: `Cạnh ${edge.from} -> ${edge.to} trỏ tới node không tồn tại` })
  }

  const starts = startNodes(workflow)
  if (starts.length === 0) issues.push({ message: 'Không có node bắt đầu (mọi node đều có cạnh vào)' })
  if (starts.length > 1) {
    issues.push({ message: `Có ${starts.length} node bắt đầu (${starts.map((n) => n.id).join(', ')}); chỉ được một node không có cạnh vào` })
  }
  if (hasCycle(workflow)) issues.push({ message: 'Workflow có vòng lặp' })

  for (const node of workflow.nodes) {
    const def = getNode(node.type)
    const out = workflow.edges.filter((e) => e.from === node.id)
    const incoming = workflow.edges.filter((e) => e.to === node.id)
    if (incoming.length > 1) issues.push({ nodeId: node.id, message: `${node.id}: có nhiều hơn một cạnh vào` })
    if (def?.branches) {
      if (out.length === 0) issues.push({ nodeId: node.id, message: `${node.id}: Condition cần ít nhất một nhánh` })
      if (out.some((e) => e.branch !== 'true' && e.branch !== 'false')) issues.push({ nodeId: node.id, message: `${node.id}: cạnh ra của Condition thiếu nhánh` })
    } else if (out.length > 1) {
      issues.push({ nodeId: node.id, message: `${node.id}: chỉ được một cạnh ra` })
    }

    for (const [prop, message] of Object.entries(configErrors(node.type, node.config))) {
      issues.push({ nodeId: node.id, prop, message: `${node.id}: ${prop} - ${message}` })
    }
    const entity = node.config.entity
    if (project && typeof entity === 'string' && entity && !project.entities.some((e) => e.name === entity)) {
      issues.push({ nodeId: node.id, prop: 'entity', message: `${node.id}: entity "${entity}" không tồn tại` })
    }
  }
  return issues
}

/** Route chọn được cho Navigate: trang tùy biến của project rồi tới trang danh sách và thêm mới của từng entity. */
export function routeChoices(project: ProjectSchema): string[] {
  const entityRoutes = project.entities.flatMap((e) => [`/${pluralKebab(e.name)}`, `/${pluralKebab(e.name)}/new`])
  return [...new Set([...project.pages.map((p) => p.route), ...entityRoutes])]
}
