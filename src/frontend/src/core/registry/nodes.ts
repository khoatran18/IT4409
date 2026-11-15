import type { PropDef } from './types'

export interface NodeDef {
  type: string
  label: string
  /** Mô tả ngắn hiện trong palette và node */
  description: string
  config: Record<string, PropDef>
  /** Node có nhánh true/false (condition) */
  branches?: boolean
  /** Prop không liên quan với cấu hình hiện tại nên ẩn khỏi panel (và không bị coi là bắt buộc) */
  hidden?: (config: Record<string, unknown>) => string[]
  /** Kiểm tra thêm ngoài prop bắt buộc; trả về danh sách lỗi theo prop */
  validate?: (config: Record<string, unknown>) => Record<string, string>
}

const nodes = new Map<string, NodeDef>()

/** Đăng ký loại node workflow; thêm node mới chỉ cần gọi hàm này một lần (như `register` của component). */
export function registerNode(def: NodeDef): void {
  if (nodes.has(def.type)) throw new Error(`Node "${def.type}" đã được đăng ký`)
  nodes.set(def.type, def)
}

export function getNode(type: string): NodeDef | undefined {
  return nodes.get(type)
}

export function listNodes(): NodeDef[] {
  return [...nodes.values()]
}

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || value === ''
}

export function defaultConfig(type: string): Record<string, unknown> {
  const config: Record<string, unknown> = {}
  for (const [name, prop] of Object.entries(nodes.get(type)?.config ?? {})) {
    if (prop.default !== undefined) config[name] = prop.default
  }
  return config
}

/** Lỗi cấu hình của một node: prop bắt buộc còn trống cộng với kiểm tra riêng của loại node. */
export function configErrors(type: string, config: Record<string, unknown>): Record<string, string> {
  const def = nodes.get(type)
  if (!def) return {}
  const errors: Record<string, string> = {}
  const merged = { ...defaultConfig(type), ...config }
  const hidden = def.hidden?.(merged) ?? []
  for (const [name, prop] of Object.entries(def.config)) {
    if (prop.required && !hidden.includes(name) && isBlank(merged[name])) errors[name] = 'Bắt buộc'
  }
  return { ...errors, ...def.validate?.(merged) }
}
