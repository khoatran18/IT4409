import type { Workflow } from '@codeflow/schema'

export interface Point {
  x: number
  y: number
}

const COLUMN = 260
const ROW = 120

/** Vị trí tự động: cột theo độ sâu từ node bắt đầu, các node cùng cột xếp dọc theo thứ tự trong workflow. */
export function layoutNodes(workflow: Workflow): Record<string, Point> {
  const depth = new Map<string, number>()
  const targets = new Set(workflow.edges.map((e) => e.to))
  const queue = workflow.nodes.filter((n) => !targets.has(n.id)).map((n) => n.id)
  for (const id of queue) depth.set(id, 0)
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i]
    for (const edge of workflow.edges) {
      if (edge.from !== id || depth.has(edge.to)) continue
      depth.set(edge.to, (depth.get(id) ?? 0) + 1)
      queue.push(edge.to)
    }
  }
  const rows = new Map<number, number>()
  const positions: Record<string, Point> = {}
  for (const node of workflow.nodes) {
    const column = depth.get(node.id) ?? 0
    const row = rows.get(column) ?? 0
    rows.set(column, row + 1)
    positions[node.id] = { x: column * COLUMN, y: row * ROW }
  }
  return positions
}
