import {
  DndContext,
  pointerWithin,
  type CollisionDetection,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useSchemaStore } from '../../core/schema-store'
import { Canvas } from './canvas/Canvas'
import type { DropData } from './canvas/DropZone'
import { Palette, type PaletteDragData } from './palette/Palette'
import { Properties } from './properties/Properties'
import './EditorPage.css'

/** Với các vùng thả lồng nhau, chọn vùng nhỏ nhất chứa con trỏ (Container trong cùng). */
const innermostWithin: CollisionDetection = (args) => {
  const hits = pointerWithin(args)
  const area = (id: string | number) => {
    const rect = args.droppableRects.get(id)
    return rect ? rect.width * rect.height : Infinity
  }
  return hits.sort((a, b) => area(a.id) - area(b.id))
}

export function EditorPage() {
  const pageId = useSchemaStore((s) => s.project.pages[0].id)
  const add = useSchemaStore((s) => s.add)

  function handleDragEnd({ active, over }: DragEndEvent) {
    const type = (active.data.current as PaletteDragData | undefined)?.componentType
    const target = over?.data.current as DropData | undefined
    if (type && target) add(pageId, target.parentId, type)
  }

  return (
    <DndContext collisionDetection={innermostWithin} onDragEnd={handleDragEnd}>
      <div className="editor">
        <Palette />
        <Canvas pageId={pageId} />
        <Properties />
      </div>
    </DndContext>
  )
}
