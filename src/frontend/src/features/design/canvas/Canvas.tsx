import { useSchemaStore } from '../../../core/schema-store'
import { DropZone } from './DropZone'
import { NodeView } from './NodeView'

export function Canvas({ pageId }: { pageId: string }) {
  const components = useSchemaStore((s) => s.project.pages.find((p) => p.id === pageId)?.components ?? [])
  const select = useSchemaStore((s) => s.select)
  return (
    <main className="canvas" onClick={() => select(null)}>
      <DropZone parentId={null} className="canvas-page">
        {components.map((node) => <NodeView key={node.id} node={node} />)}
        {components.length === 0 && <span className="hint">Kéo component từ Palette vào đây</span>}
      </DropZone>
    </main>
  )
}
