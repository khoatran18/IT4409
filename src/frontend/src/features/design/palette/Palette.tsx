import { useDraggable } from '@dnd-kit/core'
import { useState } from 'react'
import { list, type ComponentCategory, type ComponentDef } from '../../../core/registry'

export interface PaletteDragData {
  componentType: string
  label: string
}

const CATEGORIES: ComponentCategory[] = ['Layout', 'Basic', 'Data']

function PaletteItem({ type, label }: { type: string; label: string }) {
  const data: PaletteDragData = { componentType: type, label }
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: `palette-${type}`, data })
  return (
    <li ref={setNodeRef} className={isDragging ? 'palette-item dragging' : 'palette-item'} {...listeners} {...attributes}>
      {label}
    </li>
  )
}

function matches(def: ComponentDef, query: string): boolean {
  const q = query.trim().toLowerCase()
  return !q || def.label.toLowerCase().includes(q) || def.type.toLowerCase().includes(q)
}

export function Palette() {
  const [query, setQuery] = useState('')
  const defs = list().filter((def) => matches(def, query))
  return (
    <aside className="panel">
      <h2>Component</h2>
      <input
        type="search"
        className="palette-search"
        placeholder="Tìm component"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {CATEGORIES.map((category) => {
        const group = defs.filter((def) => def.category === category)
        if (group.length === 0) return null
        return (
          <section key={category}>
            <h3 className="palette-group">{category}</h3>
            <ul className="palette-list">
              {group.map((def) => <PaletteItem key={def.type} type={def.type} label={def.label} />)}
            </ul>
          </section>
        )
      })}
      {defs.length === 0 && <p className="hint">Không có component phù hợp</p>}
    </aside>
  )
}
