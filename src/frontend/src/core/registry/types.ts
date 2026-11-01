export type PropDef =
  | { type: 'string'; default?: string; required?: boolean }
  | { type: 'number'; default?: number; required?: boolean }
  | { type: 'boolean'; default?: boolean; required?: boolean }
  | { type: 'enum'; options: string[]; default?: string; required?: boolean }
  | { type: 'entityRef'; default?: string; required?: boolean }
  | { type: 'fieldList'; default?: string[]; required?: boolean }
  /** Danh sách chuỗi; có `choices` thì chọn từ tập cố định, không thì nhập mỗi dòng một giá trị */
  | { type: 'stringList'; choices?: string[]; default?: string[]; required?: boolean }

export type ComponentCategory = 'Layout' | 'Basic' | 'Data'

export interface ComponentDef {
  type: string
  label: string
  props: Record<string, PropDef>
  events: string[]
  container?: boolean
  category?: ComponentCategory
  /** Đường dẫn template sinh JSX, tính từ templates/frontend */
  template: string
}
