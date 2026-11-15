import type { ComponentNode, ProjectSchema } from '@codeflow/schema'
import { createContext, useContext } from 'react'

export interface PreviewContextValue {
  project: ProjectSchema
  role: string
  /** Hiện thông báo ngắn (thay cho toast của app thật) */
  notify: (message: string) => void
  /** Chạy workflow gắn vào sự kiện của component, nếu có */
  fire: (node: ComponentNode, event: string) => void
}

export const PreviewContext = createContext<PreviewContextValue | null>(null)

export function usePreview(): PreviewContextValue {
  const value = useContext(PreviewContext)
  if (!value) throw new Error('Component preview phải nằm trong <Preview>')
  return value
}
