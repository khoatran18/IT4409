import { createContext } from 'react'

export const ROOT_DROP_ID = 'canvas-root'

/** index = khe chèn trong danh sách con của parentId; bỏ trống nghĩa là thêm vào cuối. */
export interface DropData {
  parentId: string | null
  index?: number
}

/** true khi đang nằm trong node đang bị kéo: không cho thả vào chính nó hay hậu duệ của nó. */
export const DragLockContext = createContext(false)
