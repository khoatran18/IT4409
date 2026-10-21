import { createEmptyProject, type ProjectSchema } from '@codeflow/schema'
import { create } from 'zustand'
import { addComponent, findComponent, removeComponent, updateProps } from './operations'

interface SchemaState {
  project: ProjectSchema
  selectedId: string | null
  load: (project: ProjectSchema) => void
  add: (pageId: string, parentId: string | null, type: string) => void
  remove: (id: string) => void
  select: (id: string | null) => void
  setProps: (id: string, props: Record<string, unknown>) => void
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
  add: (pageId, parentId, type) =>
    set((s) => {
      const result = addComponent(s.project, pageId, parentId, type)
      return result.id ? { project: result.project, selectedId: result.id } : s
    }),
  remove: (id) =>
    set((s) => {
      const project = removeComponent(s.project, id)
      return { project, selectedId: s.selectedId && findComponent(project, s.selectedId) ? s.selectedId : null }
    }),
  select: (id) => set({ selectedId: id }),
  setProps: (id, props) => set((s) => ({ project: updateProps(s.project, id, props) })),
}))
