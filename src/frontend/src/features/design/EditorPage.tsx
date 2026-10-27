import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { schoolAdminSample } from '@codeflow/schema'
import { useEffect, useState } from 'react'
import { useSchemaStore } from '../../core/schema-store'
import { Canvas } from './canvas/Canvas'
import type { DropData } from './canvas/drag'
import type { NodeDragData } from './canvas/NodeView'
import { Palette, type PaletteDragData } from './palette/Palette'
import { Properties } from './properties/Properties'
import './EditorPage.css'

/** Với các vùng thả lồng nhau, chọn vùng nhỏ nhất chứa con trỏ (khe chèn hoặc Container trong cùng). */
const innermostWithin: CollisionDetection = (args) => {
  const hits = pointerWithin(args)
  const area = (id: string | number) => {
    const rect = args.droppableRects.get(id)
    return rect ? rect.width * rect.height : Infinity
  }
  return hits.sort((a, b) => area(a.id) - area(b.id))
}

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
}

export function EditorPage() {
  const pages = useSchemaStore((s) => s.project.pages)
  const add = useSchemaStore((s) => s.add)
  const move = useSchemaStore((s) => s.move)
  const load = useSchemaStore((s) => s.load)
  const [chosenPageId, setChosenPageId] = useState<string>()
  const [dragLabel, setDragLabel] = useState<string>()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const page = pages.find((p) => p.id === chosenPageId) ?? pages[0]

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.key !== 'Delete' && e.key !== 'Backspace') || isTyping(e.target)) return
      const { selectedId, remove } = useSchemaStore.getState()
      if (!selectedId) return
      e.preventDefault()
      remove(selectedId)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  function handleDragStart({ active }: DragStartEvent) {
    setDragLabel((active.data.current as { label?: string } | undefined)?.label)
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setDragLabel(undefined)
    const target = over?.data.current as DropData | undefined
    if (!target || !page) return
    const dragged = active.data.current as Partial<PaletteDragData & NodeDragData> | undefined
    const index = target.index ?? Infinity
    if (dragged?.componentType) add(page.id, target.parentId, dragged.componentType, target.index)
    else if (dragged?.nodeId) move(dragged.nodeId, page.id, target.parentId, index)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={innermostWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDragLabel(undefined)}
    >
      <div className="editor">
        <Palette />
        <div className="editor-main">
          <div className="editor-toolbar">
            {pages.length > 1 && (
              <select aria-label="Trang" value={page?.id} onChange={(e) => setChosenPageId(e.target.value)}>
                {pages.map((p) => <option key={p.id} value={p.id}>{p.title} ({p.route})</option>)}
              </select>
            )}
            {import.meta.env.DEV && (
              <button type="button" onClick={() => load(structuredClone(schoolAdminSample))}>
                Nạp schema mẫu
              </button>
            )}
          </div>
          {page ? <Canvas pageId={page.id} /> : <p className="hint">Project chưa có trang nào</p>}
        </div>
        <Properties />
      </div>
      <DragOverlay dropAnimation={null}>{dragLabel ? <div className="drag-chip">{dragLabel}</div> : null}</DragOverlay>
    </DndContext>
  )
}
