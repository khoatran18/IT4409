import type { WorkflowNode } from '@codeflow/schema'

const OPERATORS: Record<string, string> = { eq: '=', neq: '≠', gt: '>', lt: '<', contains: 'chứa', empty: 'rỗng' }

/** Một dòng mô tả cấu hình node để hiện ngay trên node. */
export function nodeSummary(node: WorkflowNode): string {
  const c = node.config
  switch (node.type) {
    case 'callApi':
      return c.entity ? `${String(c.op ?? 'create')} ${String(c.entity)}` : 'Chưa chọn entity'
    case 'condition':
      return c.field ? `${String(c.source ?? 'values')}.${String(c.field)} ${OPERATORS[String(c.operator ?? 'eq')]} ${c.operator === 'empty' ? '' : String(c.value ?? '')}`.trim() : 'Chưa nhập điều kiện'
    case 'navigate':
      return c.to ? String(c.to) : 'Chưa chọn trang'
    case 'showMessage':
      return c.text ? `${String(c.kind ?? 'success')}: ${String(c.text)}` : 'Chưa nhập nội dung'
    default:
      return ''
  }
}
