import type { ProjectSchema } from '@codeflow/schema'

export type EventAction =
  | { kind: 'navigate'; to: string }
  | { kind: 'unsupported'; message: string }

/**
 * Preview chỉ mô phỏng workflow có node navigate; phần còn lại (gọi API, điều kiện...) chưa chạy được.
 * Trả về null khi sự kiện chưa gắn workflow.
 */
export function resolveEvent(project: ProjectSchema, workflowId: string | undefined): EventAction | null {
  if (!workflowId) return null
  const workflow = project.workflows.find((w) => w.id === workflowId)
  if (!workflow) return { kind: 'unsupported', message: `Workflow "${workflowId}" không tồn tại` }
  const navigate = workflow.nodes.find((n) => n.type === 'navigate' && typeof n.config.to === 'string')
  if (navigate) return { kind: 'navigate', to: String(navigate.config.to) }
  return { kind: 'unsupported', message: 'Workflow chưa hỗ trợ trong preview' }
}

export function isVisibleTo(requireRole: string[], role: string): boolean {
  return requireRole.length === 0 || requireRole.includes(role)
}
