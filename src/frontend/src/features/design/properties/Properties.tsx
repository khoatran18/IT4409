import type { ComponentNode, ProjectSchema } from '@codeflow/schema'
import { get, missingRequired, type ComponentDef, type PropDef } from '../../../core/registry'
import { addWorkflow, findComponent, setEvent, useSchemaStore } from '../../../core/schema-store'
import { PropControl, type FieldProps } from './PropControl'

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
      <PropControl {...props} />
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

function EventsForm({ node, def, onOpenWorkflow }: { node: ComponentNode; def: ComponentDef; onOpenWorkflow?: (id: string) => void }) {
  const workflows = useSchemaStore((s) => s.project.workflows)
  const update = (fn: (project: ProjectSchema) => ProjectSchema) => useSchemaStore.setState((s) => ({ project: fn(s.project) }))

  function createFor(event: string) {
    const created = addWorkflow(useSchemaStore.getState().project)
    useSchemaStore.setState({ project: setEvent(created.project, node.id, event, created.id) })
    if (created.id) onOpenWorkflow?.(created.id)
  }

  return def.events.map((event) => {
    const current = node.events?.[event] ?? ''
    return (
      <div className="prop" key={`${node.id}-${event}`}>
        <label htmlFor={`event-${event}`}>Workflow cho {event}</label>
        <select
          id={`event-${event}`}
          value={current}
          onChange={(e) => update((project) => setEvent(project, node.id, event, e.target.value || undefined))}
        >
          <option value="">-- không --</option>
          {current && !workflows.some((w) => w.id === current) && <option value={current}>{current} (không tồn tại)</option>}
          {workflows.map((w) => <option key={w.id} value={w.id}>{w.id}</option>)}
        </select>
        <div className="prop-event-actions">
          <button type="button" onClick={() => createFor(event)}>Tạo workflow mới</button>
          {current && onOpenWorkflow && <button type="button" onClick={() => onOpenWorkflow(current)}>Mở workflow</button>}
        </div>
      </div>
    )
  })
}

export function Properties({ onOpenWorkflow }: { onOpenWorkflow?: (id: string) => void }) {
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
          <EventsForm node={node} def={def} onOpenWorkflow={onOpenWorkflow} />
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
