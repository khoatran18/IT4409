import { useDroppable } from '@dnd-kit/core'
import { useContext, type ReactNode } from 'react'
import { DragLockContext, ROOT_DROP_ID, type DropData } from './drag'

/** parentId = null là gốc trang; ngược lại là id của Container nhận con. */
export function DropZone({ parentId, className, children }: { parentId: string | null; className: string; children: ReactNode }) {
  const data: DropData = { parentId }
  const locked = useContext(DragLockContext)
  const { setNodeRef, isOver } = useDroppable({ id: parentId ?? ROOT_DROP_ID, data, disabled: locked })
  return (
    <div ref={setNodeRef} className={isOver ? `${className} over` : className}>
      {children}
    </div>
  )
}

/** Khe mỏng giữa hai component: thả vào đây để chèn đúng vị trí, hiện vạch chỉ báo khi con trỏ ở trên. */
export function InsertSlot({ parentId, index, horizontal }: { parentId: string | null; index: number; horizontal: boolean }) {
  const data: DropData = { parentId, index }
  const locked = useContext(DragLockContext)
  const { setNodeRef, isOver } = useDroppable({ id: `slot-${parentId ?? ROOT_DROP_ID}-${index}`, data, disabled: locked })
  const classes = ['slot', horizontal ? 'slot-h' : 'slot-v', isOver ? 'slot-over' : ''].join(' ').trim()
  return <div ref={setNodeRef} className={classes} />
}
