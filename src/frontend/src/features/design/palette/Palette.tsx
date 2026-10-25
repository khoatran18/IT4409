import { useDraggable } from '@dnd-kit/core'
import { list } from '../../../core/registry'

export interface PaletteDragData {
  componentType: string
}

function PaletteItem({ type, label }: { type: string; label: string }) {
  const data: PaletteDragData = { componentType: type }
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: `palette-${type}`, data })
  return (
    <li ref={setNodeRef} className={isDragging ? 'palette-item dragging' : 'palette-item'} {...listeners} {...attributes}>
      {label}
    </li>
  )
}

export function Palette() {
  return (
    <aside className="panel">
      <h2>Component</h2>
      <ul className="palette-list">
        {list().map((def) => <PaletteItem key={def.type} type={def.type} label={def.label} />)}
      </ul>
    </aside>
  )
}
