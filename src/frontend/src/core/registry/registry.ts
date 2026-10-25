import type { ComponentNode } from '@codeflow/schema'
import type { ComponentDef } from './types'

const defs = new Map<string, ComponentDef>()

export function register(def: ComponentDef): void {
  if (defs.has(def.type)) throw new Error(`Component "${def.type}" đã được đăng ký`)
  defs.set(def.type, def)
}

export function get(type: string): ComponentDef | undefined {
  return defs.get(type)
}

export function list(): ComponentDef[] {
  return [...defs.values()]
}

export function defaultProps(type: string): Record<string, unknown> {
  const def = defs.get(type)
  if (!def) return {}
  const props: Record<string, unknown> = {}
  for (const [name, prop] of Object.entries(def.props)) {
    if (prop.default !== undefined) props[name] = prop.default
  }
  return props
}

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)
}

export function missingRequired(node: Pick<ComponentNode, 'type' | 'props'>): string[] {
  const def = defs.get(node.type)
  if (!def) return []
  return Object.entries(def.props)
    .filter(([name, prop]) => prop.required && isEmpty(node.props[name] ?? prop.default))
    .map(([name]) => name)
}
