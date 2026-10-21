export type PropDef =
  | { type: 'string'; default?: string; required?: boolean }
  | { type: 'number'; default?: number; required?: boolean }
  | { type: 'boolean'; default?: boolean; required?: boolean }
  | { type: 'enum'; options: string[]; default?: string; required?: boolean }
  | { type: 'entityRef'; default?: string; required?: boolean }
  | { type: 'fieldList'; default?: string[]; required?: boolean }

export interface ComponentDef {
  type: string
  label: string
  props: Record<string, PropDef>
  events: string[]
  container?: boolean
  /** Đường dẫn template sinh JSX, tính từ templates/frontend */
  template: string
}
