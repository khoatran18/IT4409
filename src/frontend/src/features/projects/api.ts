import { api } from '../../shared/api'

export interface ProjectSummary {
  id: string
  name: string
  version: number
  ownerId: string
  createdAt: string
  updatedAt: string
}

export interface ProjectList {
  data: ProjectSummary[]
  meta: { page: number; pageSize: number; total: number }
}

export const projectsApi = {
  async list(page = 1, pageSize = 10) {
    const res = await api.get<ProjectList>('/projects', { params: { page, pageSize } })
    return res.data
  },
}
