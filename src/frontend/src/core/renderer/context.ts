import type { ComponentNode, ProjectSchema } from '@codeflow/schema'
import { createContext, useContext } from 'react'
import type { MessageKind } from './run-workflow'

export interface FireOptions {
  /** Giá trị truyền vào workflow; mặc định là các ô nhập đang bind của trang */
  values?: Record<string, unknown>
  params?: Record<string, unknown>
}

export interface PreviewContextValue {
  project: ProjectSchema
  role: string
  /** Giá trị các ô Input/Select/Checkbox có `bindField` trên trang hiện tại */
  values: Record<string, unknown>
  setValue: (name: string, value: unknown) => void
  /** Hiện thông báo ngắn (thay cho toast của app thật) */
  notify: (message: string, kind?: MessageKind) => void
  /** Chạy workflow gắn vào sự kiện của component, nếu có */
  fire: (node: ComponentNode, event: string, options?: FireOptions) => Promise<void>
}

export const PreviewContext = createContext<PreviewContextValue | null>(null)

export function usePreview(): PreviewContextValue {
  const value = useContext(PreviewContext)
  if (!value) throw new Error('Component preview phải nằm trong <Preview>')
  return value
}
