import type { WorkflowNode } from '@codeflow/schema'
import { configErrors, defaultConfig, getNode } from '../../core/registry'
import { removeNode, routeChoices, updateNodeConfig, useSchemaStore } from '../../core/schema-store'
import { PropControl } from '../design/properties/PropControl'
import { applyToProject } from './actions'

export function NodeConfigPanel({ workflowId, node }: { workflowId: string; node: WorkflowNode }) {
  const project = useSchemaStore((s) => s.project)
  const def = getNode(node.type)
  if (!def) return <p className="hint">Loại node "{node.type}" chưa đăng ký</p>

  const merged = { ...defaultConfig(node.type), ...node.config }
  const errors = configErrors(node.type, node.config)
  const hidden = def.hidden?.(merged) ?? []
  const routes = routeChoices(project)
  const entity = project.entities.find((e) => e.name === merged.entity)

  return (
    <div className="wf-config">
      <p>
        {def.label} <span className="hint">({node.id})</span>
      </p>
      {Object.entries(def.config)
        .filter(([name]) => !hidden.includes(name))
        .map(([name, propDef]) => (
          <div key={`${node.id}-${name}`} className={errors[name] ? 'prop prop-invalid' : 'prop'}>
            <label htmlFor={`prop-${name}`}>
              {name}
              {propDef.required && <span className="prop-required"> *</span>}
            </label>
            <PropControl
              name={name}
              def={propDef}
              value={merged[name]}
              entities={project.entities}
              entity={entity}
              routes={routes}
              invalid={Boolean(errors[name])}
              onChange={(value) => applyToProject((p) => updateNodeConfig(p, workflowId, node.id, { [name]: value }))}
            />
            {errors[name] && <span className="prop-error">{errors[name]}</span>}
          </div>
        ))}
      <button type="button" className="prop-delete" onClick={() => applyToProject((p) => removeNode(p, workflowId, node.id))}>
        Xóa node
      </button>
    </div>
  )
}
