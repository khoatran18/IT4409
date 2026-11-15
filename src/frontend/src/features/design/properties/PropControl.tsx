import type { Entity } from '@codeflow/schema'
import type { PropDef } from '../../../core/registry'

export interface FieldProps {
  name: string
  def: PropDef
  value: unknown
  entities: Entity[]
  /** Entity đang chọn ở prop entityRef của cùng component, dùng cho fieldList */
  entity: Entity | undefined
  invalid: boolean
  /** Route gợi ý cho prop kiểu route: trang của project và trang entity */
  routes?: string[]
  onChange: (value: unknown) => void
}

function listOf(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : []
}

function CheckList({ choices, value, onChange }: { choices: string[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="prop-checks">
      {choices.map((choice) => (
        <label key={choice}>
          <input
            type="checkbox"
            checked={value.includes(choice)}
            onChange={(e) => onChange(e.target.checked ? [...value, choice] : value.filter((v) => v !== choice))}
          />
          {choice}
        </label>
      ))}
    </div>
  )
}

export function PropControl({ name, def, value, entities, entity, routes = [], onChange }: FieldProps) {
  switch (def.type) {
    case 'string':
      return (
        <input
          id={`prop-${name}`}
          type="text"
          value={typeof value === 'string' ? value : ''}
          placeholder={def.default ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )
    case 'number':
      return (
        <input
          id={`prop-${name}`}
          type="number"
          min={def.min}
          max={def.max}
          value={typeof value === 'number' ? value : ''}
          placeholder={def.default === undefined ? '' : String(def.default)}
          onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        />
      )
    case 'boolean':
      return (
        <input id={`prop-${name}`} type="checkbox" checked={Boolean(value ?? def.default)} onChange={(e) => onChange(e.target.checked)} />
      )
    case 'enum':
      return (
        <select id={`prop-${name}`} value={String(value ?? def.default ?? '')} onChange={(e) => onChange(e.target.value)}>
          {def.default === undefined && <option value="">-- chọn --</option>}
          {def.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      )
    case 'entityRef':
      return (
        <select id={`prop-${name}`} value={String(value ?? '')} onChange={(e) => onChange(e.target.value || undefined)}>
          <option value="">-- chọn entity --</option>
          {entities.map((e) => <option key={e.name} value={e.name}>{e.name}</option>)}
        </select>
      )
    case 'route':
      return (
        <select id={`prop-${name}`} value={String(value ?? '')} onChange={(e) => onChange(e.target.value || undefined)}>
          <option value="">-- chọn trang --</option>
          {typeof value === 'string' && value && !routes.includes(value) && <option value={value}>{value}</option>}
          {routes.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      )
    case 'fieldList':
      return entity ? (
        <CheckList choices={entity.fields.map((f) => f.name)} value={listOf(value)} onChange={onChange} />
      ) : (
        <span className="hint">Chọn entity trước</span>
      )
    case 'stringList': {
      const current = listOf(value ?? def.default)
      return def.choices ? (
        <CheckList choices={def.choices} value={current} onChange={onChange} />
      ) : (
        <textarea
          id={`prop-${name}`}
          rows={3}
          placeholder="Mỗi dòng một giá trị"
          value={listOf(value).join('\n')}
          onChange={(e) => onChange(e.target.value === '' ? undefined : e.target.value.split('\n'))}
        />
      )
    }
  }
}

