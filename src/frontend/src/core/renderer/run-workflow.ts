import type { Workflow, WorkflowNode } from '@codeflow/schema'

export type MessageKind = 'success' | 'error' | 'info'

export interface ApiCall {
  entity: string
  op: string
  /** Id bản ghi cho get/update/delete */
  id?: string
  values: Record<string, unknown>
}

/** Phần "bên ngoài" của workflow; preview cấp bản giả lập, app sinh ra cấp bản thật. */
export interface WorkflowEffects {
  values: Record<string, unknown>
  /** Tham số của sự kiện, ví dụ `id` của dòng vừa bấm trong Table */
  params?: Record<string, unknown>
  callApi: (call: ApiCall) => Promise<unknown>
  navigate: (to: string) => void
  message: (kind: MessageKind, text: string) => void
}

export interface StepLog {
  nodeId: string
  /** Với condition: nhánh được chọn */
  branch?: 'true' | 'false'
  error?: string
}

export interface WorkflowRun {
  ok: boolean
  steps: StepLog[]
  error?: string
}

const MAX_STEPS = 100

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)
}

export interface Condition {
  source?: unknown
  field?: unknown
  operator?: unknown
  value?: unknown
}

export function evaluateCondition(config: Condition, values: Record<string, unknown>, result: unknown): boolean {
  const scope = config.source === 'result' ? result : values
  const actual = scope !== null && typeof scope === 'object' ? (scope as Record<string, unknown>)[String(config.field ?? '')] : undefined
  const expected = config.value
  switch (config.operator) {
    case 'neq':
      return String(actual ?? '') !== String(expected ?? '')
    case 'gt':
      return !isEmpty(actual) && Number(actual) > Number(expected)
    case 'lt':
      return !isEmpty(actual) && Number(actual) < Number(expected)
    case 'contains':
      return String(actual ?? '').includes(String(expected ?? ''))
    case 'empty':
      return isEmpty(actual)
    default:
      return String(actual ?? '') === String(expected ?? '')
  }
}

function startOf(workflow: Workflow): WorkflowNode | undefined {
  const targets = new Set(workflow.edges.map((e) => e.to))
  return workflow.nodes.find((n) => !targets.has(n.id))
}

/**
 * Chạy workflow tuần tự từ node bắt đầu: mỗi node xong thì đi theo cạnh ra (condition chọn cạnh theo kết quả).
 * Lỗi của callApi dừng workflow và được báo trong kết quả; không bao giờ ném ngoại lệ ra ngoài.
 */
export async function runWorkflow(workflow: Workflow, effects: WorkflowEffects): Promise<WorkflowRun> {
  const steps: StepLog[] = []
  const nodes = new Map(workflow.nodes.map((n) => [n.id, n]))
  let current = startOf(workflow)
  let result: unknown

  while (current) {
    if (steps.length >= MAX_STEPS) return { ok: false, steps, error: 'Workflow chạy quá nhiều bước (có vòng lặp?)' }
    const { id, type, config } = current
    let branch: 'true' | 'false' | undefined

    try {
      if (type === 'callApi') {
        const idSource = config.idSource === 'param' ? effects.params?.id : effects.values.id
        result = await effects.callApi({
          entity: String(config.entity ?? ''),
          op: String(config.op ?? 'create'),
          id: isEmpty(idSource) ? undefined : String(idSource),
          values: effects.values,
        })
      } else if (type === 'condition') {
        branch = evaluateCondition(config, effects.values, result) ? 'true' : 'false'
      } else if (type === 'navigate') {
        effects.navigate(String(config.to ?? ''))
      } else if (type === 'showMessage') {
        const kind = config.kind === 'error' || config.kind === 'info' ? config.kind : 'success'
        effects.message(kind, String(config.text ?? ''))
      }
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e)
      steps.push({ nodeId: id, error })
      return { ok: false, steps, error }
    }

    steps.push(branch ? { nodeId: id, branch } : { nodeId: id })
    const edge = workflow.edges.find((e) => e.from === id && (branch === undefined || e.branch === branch))
    current = edge && nodes.get(edge.to)
  }
  return { ok: true, steps }
}
