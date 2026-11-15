import type { ProjectSchema } from '@codeflow/schema'
import { useSchemaStore } from '../../core/schema-store'

/** Áp một thao tác thuần lên project trong store. */
export function applyToProject(fn: (project: ProjectSchema) => ProjectSchema): void {
  useSchemaStore.setState((s) => ({ project: fn(s.project) }))
}
