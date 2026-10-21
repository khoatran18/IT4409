import { useDroppable } from '@dnd-kit/core'
import type { ReactNode } from 'react'

export const ROOT_DROP_ID = 'canvas-root'

export interface DropData {
  parentId: string | null
}

/** parentId = null là gốc trang; ngược lại là id của Container nhận con. */
export function DropZone({ parentId, className, children }: { parentId: string | null; className: string; children: ReactNode }) {
  const data: DropData = { parentId }
  const { setNodeRef, isOver } = useDroppable({ id: parentId ?? ROOT_DROP_ID, data })
  return (
    <div ref={setNodeRef} className={isOver ? `${className} over` : className}>
      {children}
    </div>
  )
}
