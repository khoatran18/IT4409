import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { getNode } from '../../core/registry'

export interface WorkflowNodeData extends Record<string, unknown> {
  type: string
  summary: string
  order?: number
  errors: string[]
}

export type WorkflowFlowNode = Node<WorkflowNodeData, 'workflow'>

export function WorkflowNodeView({ id, data, selected }: NodeProps<WorkflowFlowNode>) {
  const def = getNode(data.type)
  const classes = ['wf-node', selected ? 'wf-node-selected' : '', data.errors.length > 0 ? 'wf-node-invalid' : ''].filter(Boolean).join(' ')
  return (
    <div className={classes} data-node-id={id} data-node-type={data.type} title={data.errors.join('\n')}>
      <Handle type="target" position={Position.Left} />
      <div className="wf-node-title">
        {data.order !== undefined && <span className="wf-node-order">{data.order}</span>}
        {def?.label ?? data.type}
      </div>
      <div className="wf-node-summary">{data.summary}</div>
      {def?.branches ? (
        <>
          <Handle type="source" position={Position.Right} id="true" style={{ top: '30%' }} />
          <span className="wf-branch wf-branch-true">true</span>
          <Handle type="source" position={Position.Right} id="false" style={{ top: '75%' }} />
          <span className="wf-branch wf-branch-false">false</span>
        </>
      ) : (
        <Handle type="source" position={Position.Right} />
      )}
    </div>
  )
}
