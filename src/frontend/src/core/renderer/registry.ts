import type { ComponentNode } from '@codeflow/schema'
import type { ComponentType } from 'react'

export interface RendererProps {
  node: ComponentNode
}

const renderers = new Map<string, ComponentType<RendererProps>>()

/** Đăng ký cách vẽ một component trong preview; thêm component mới chỉ cần gọi hàm này một lần. */
export function registerRenderer(type: string, component: ComponentType<RendererProps>): void {
  if (renderers.has(type)) throw new Error(`Renderer "${type}" đã được đăng ký`)
  renderers.set(type, component)
}

export function getRenderer(type: string): ComponentType<RendererProps> | undefined {
  return renderers.get(type)
}
