import type { ComponentNode } from '@codeflow/schema'
import { createElement } from 'react'
import { getRenderer } from './registry'

export function RenderNode({ node }: { node: ComponentNode }) {
  const renderer = getRenderer(node.type)
  if (!renderer) return <div className="rp-unknown">Component "{node.type}" chưa hỗ trợ trong preview</div>
  return createElement(renderer, { node })
}

export function RenderChildren({ nodes }: { nodes: ComponentNode[] | undefined }) {
  return nodes?.map((child) => <RenderNode key={child.id} node={child} />)
}
