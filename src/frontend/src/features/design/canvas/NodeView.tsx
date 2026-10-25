import type { ComponentNode } from '@codeflow/schema'
import type { CSSProperties } from 'react'
import { useSchemaStore } from '../../../core/schema-store'
import { DropZone } from './DropZone'

const textSize = { sm: 12, md: 16, lg: 24 } as const

function Preview({ node }: { node: ComponentNode }) {
  const props = node.props
  switch (node.type) {
    case 'Text': {
      const style: CSSProperties = {
        fontSize: textSize[props.size as keyof typeof textSize] ?? 16,
        fontWeight: props.weight === 'bold' ? 700 : 400,
      }
      return <span style={style}>{String(props.content ?? '')}</span>
    }
    case 'Button':
      return (
        <button type="button" className={`pv-button pv-${String(props.variant)}`} disabled={Boolean(props.disabled)}>
          {String(props.text ?? '')}
        </button>
      )
    case 'Container':
      return (
        <DropZone parentId={node.id} className="pv-container">
          <div
            className="pv-container-body"
            style={{ flexDirection: props.direction === 'row' ? 'row' : 'column', gap: Number(props.gap ?? 0) }}
          >
            {node.children?.map((child) => <NodeView key={child.id} node={child} />)}
            {!node.children?.length && <span className="hint">Thả component vào đây</span>}
          </div>
        </DropZone>
      )
    default:
      return <span className="hint">{node.type}</span>
  }
}

export function NodeView({ node }: { node: ComponentNode }) {
  const selected = useSchemaStore((s) => s.selectedId === node.id)
  const select = useSchemaStore((s) => s.select)
  return (
    <div
      className={selected ? 'node selected' : 'node'}
      onClick={(e) => {
        e.stopPropagation()
        select(node.id)
      }}
    >
      <Preview node={node} />
    </div>
  )
}
