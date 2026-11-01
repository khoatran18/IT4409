import { Fragment } from 'react'
import { useSchemaStore } from '../../../core/schema-store'
import { DropZone, InsertSlot } from './DropZone'
import { NodeView } from './NodeView'

export function Canvas({ pageId }: { pageId: string }) {
  const components = useSchemaStore((s) => s.project.pages.find((p) => p.id === pageId)?.components ?? [])
  const select = useSchemaStore((s) => s.select)
  return (
    <main className="canvas" onClick={() => select(null)}>
      <DropZone parentId={null} className="canvas-page">
        {components.map((node, i) => (
          <Fragment key={node.id}>
            <InsertSlot parentId={null} index={i} horizontal={false} />
            <NodeView node={node} />
          </Fragment>
        ))}
        {components.length > 0 && <InsertSlot parentId={null} index={components.length} horizontal={false} />}
        {components.length === 0 && <span className="hint">Kéo component từ Palette vào đây</span>}
      </DropZone>
    </main>
  )
}
