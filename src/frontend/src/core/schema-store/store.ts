import { createEmptyProject, type ProjectSchema } from '@codeflow/schema'
import { create } from 'zustand'
import { addComponent, findComponent, moveComponent, removeComponent, resetProps, updateProps } from './operations'

interface SchemaState {
  project: ProjectSchema
  selectedId: string | null
  load: (project: ProjectSchema) => void
  add: (pageId: string, parentId: string | null, type: string, index?: number) => void
  move: (id: string, pageId: string, parentId: string | null, index: number) => void
  remove: (id: string) => void
  select: (id: string | null) => void
  setProps: (id: string, props: Record<string, unknown>) => void
  resetProps: (id: string, names: string[]) => void
}

export function initialProject(): ProjectSchema {
  const project = createEmptyProject('untitled')
  return project.pages.length > 0
    ? project
    : { ...project, pages: [{ id: 'p1', route: '/', title: 'Trang chủ', requireRole: [], components: [] }] }
}

export const useSchemaStore = create<SchemaState>((set) => ({
  project: initialProject(),
  selectedId: null,
  load: (project) => set({ project, selectedId: null }),
  add: (pageId, parentId, type, index) =>
    set((s) => {
      const result = addComponent(s.project, pageId, parentId, type, index)
      return result.id ? { project: result.project, selectedId: result.id } : s
    }),
  move: (id, pageId, parentId, index) =>
    set((s) => {
      const project = moveComponent(s.project, id, pageId, parentId, index)
      return project === s.project ? s : { project }
    }),
  remove: (id) =>
    set((s) => {
      const project = removeComponent(s.project, id)
      return { project, selectedId: s.selectedId && findComponent(project, s.selectedId) ? s.selectedId : null }
    }),
  select: (id) => set({ selectedId: id }),
  setProps: (id, props) => set((s) => ({ project: updateProps(s.project, id, props) })),
  resetProps: (id, names) => set((s) => ({ project: resetProps(s.project, id, names) })),
}))
