import type { ComponentNode, Entity } from '@codeflow/schema'
import { get, missingRequired, type ComponentDef, type PropDef } from '../../../core/registry'
import { findComponent, useSchemaStore } from '../../../core/schema-store'

interface FieldProps {
  name: string
  def: PropDef
  value: unknown
  entities: Entity[]
  /** Entity đang chọn ở prop entityRef của cùng component, dùng cho fieldList */
  entity: Entity | undefined
  invalid: boolean
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

function Control({ name, def, value, entities, entity, onChange }: FieldProps) {
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

function PropField(props: FieldProps) {
  const { name, def, value, invalid, onChange } = props
  const reset = () => onChange(undefined)
  const modified = value !== undefined && JSON.stringify(value) !== JSON.stringify(def.default)
  return (
    <div className={invalid ? 'prop prop-invalid' : 'prop'}>
      <label htmlFor={`prop-${name}`}>
        {name}
        {def.required && <span className="prop-required"> *</span>}
      </label>
      <Control {...props} />
      {invalid && <span className="prop-error">bắt buộc</span>}
      {modified && (
        <button type="button" className="prop-reset" onClick={reset}>
          Khôi phục mặc định
        </button>
      )}
    </div>
  )
}

function PropsForm({ node, def }: { node: ComponentNode; def: ComponentDef }) {
  const entities = useSchemaStore((s) => s.project.entities)
  const setProps = useSchemaStore((s) => s.setProps)
  const resetProps = useSchemaStore((s) => s.resetProps)
  const missing = missingRequired(node)
  const entityProp = Object.entries(def.props).find(([, p]) => p.type === 'entityRef')?.[0]
  const entity = entities.find((e) => e.name === (entityProp && node.props[entityProp]))

  function change(name: string, propDef: PropDef, value: unknown) {
    // Đổi entity thì các cột đã chọn không còn hợp lệ
    const dependent =
      propDef.type === 'entityRef' ? Object.entries(def.props).filter(([, p]) => p.type === 'fieldList').map(([n]) => n) : []
    if (value === undefined) {
      resetProps(node.id, [name, ...dependent])
      return
    }
    setProps(node.id, { [name]: value })
    if (dependent.length > 0) resetProps(node.id, dependent)
  }

  return Object.entries(def.props).map(([name, propDef]) => (
    <PropField
      key={`${node.id}-${name}`}
      name={name}
      def={propDef}
      value={node.props[name]}
      entities={entities}
      entity={entity}
      invalid={missing.includes(name)}
      onChange={(value) => change(name, propDef, value)}
    />
  ))
}

export function Properties() {
  const node = useSchemaStore((s) => (s.selectedId ? findComponent(s.project, s.selectedId) : undefined))
  const remove = useSchemaStore((s) => s.remove)
  const def = node && get(node.type)

  return (
    <aside className="panel">
      <h2>Thuộc tính</h2>
      {node && def ? (
        <>
          <p>
            {def.label} <span className="hint">({node.id})</span>
          </p>
          <PropsForm node={node} def={def} />
          <button type="button" className="prop-delete" onClick={() => remove(node.id)}>
            Xóa component
          </button>
        </>
      ) : (
        <p className="hint">Chọn một component trên canvas</p>
      )}
    </aside>
  )
}
