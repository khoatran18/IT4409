import type { ProjectSchema } from '@codeflow/schema'
import type { ApiCall } from './run-workflow'
import { sampleRows } from './sample-data'

/** Giả lập API của entity trên dữ liệu mẫu, dùng khi chạy workflow trong preview (không ghi gì xuống đâu cả). */
export async function simulateApi(project: ProjectSchema, call: ApiCall): Promise<unknown> {
  const entity = project.entities.find((e) => e.name === call.entity)
  if (!entity) throw new Error(`Entity "${call.entity}" không tồn tại`)
  const rows = sampleRows(entity)

  if (call.op === 'list') return { data: rows, meta: { page: 1, pageSize: rows.length, total: rows.length } }
  if (call.op === 'create') return { ...call.values, id: 'sample-new' }
  if (!call.id) throw new Error(`Thiếu id để ${call.op} ${call.entity}`)

  const row = rows.find((r) => r.id === call.id)
  if (!row) throw new Error(`Không tìm thấy ${call.entity} "${call.id}"`)
  if (call.op === 'update') return { ...row, ...call.values, id: row.id }
  return call.op === 'delete' ? undefined : row
}
