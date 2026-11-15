import { Background, Controls, ReactFlow, type Connection, type Edge, type EdgeChange, type NodeChange } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useMemo, useState } from 'react'
import { listNodes } from '../../core/registry'
import {
  addNode,
  addWorkflow,
  connect,
  disconnect,
  executionOrder,
  removeNode,
  removeWorkflow,
  useSchemaStore,
  validateWorkflow,
} from '../../core/schema-store'
import { applyToProject } from './actions'
import { layoutNodes, type Point } from './layout'
import { NodeConfigPanel } from './NodeConfigPanel'
import { nodeSummary } from './summary'
import { WorkflowNodeView, type WorkflowFlowNode } from './WorkflowNodeView'
import './workflow.css'

const nodeTypes = { workflow: WorkflowNodeView }

function edgeId(e: { from: string; to: string; branch?: string }): string {
  return `${e.from}|${e.branch ?? ''}|${e.to}`
}

interface WorkflowEditorProps {
  /** Workflow mở sẵn (ví dụ vừa tạo từ Properties) */
  workflowId?: string
  onSelectWorkflow?: (id: string | undefined) => void
}

export function WorkflowEditor({ workflowId, onSelectWorkflow }: WorkflowEditorProps) {
  const project = useSchemaStore((s) => s.project)
  const [selectedNodeId, setSelectedNodeId] = useState<string>()
  const [moved, setMoved] = useState<Record<string, Point>>({})
  const [notice, setNotice] = useState('')

  const workflow = project.workflows.find((w) => w.id === workflowId) ?? project.workflows[0]
  const issues = useMemo(() => (workflow ? validateWorkflow(workflow, project) : []), [workflow, project])
  const selected = workflow?.nodes.find((n) => n.id === selectedNodeId)

  const { nodes, edges } = useMemo(() => {
    if (!workflow) return { nodes: [] as WorkflowFlowNode[], edges: [] as Edge[] }
    const auto = layoutNodes(workflow)
    const order = executionOrder(workflow)
    return {
      nodes: workflow.nodes.map<WorkflowFlowNode>((n) => ({
        id: n.id,
        type: 'workflow',
        position: moved[`${workflow.id}/${n.id}`] ?? auto[n.id],
        selected: n.id === selectedNodeId,
        data: {
          type: n.type,
          summary: nodeSummary(n),
          order: order.includes(n.id) ? order.indexOf(n.id) + 1 : undefined,
          errors: issues.filter((i) => i.nodeId === n.id).map((i) => i.message),
        },
      })),
      edges: workflow.edges.map<Edge>((e) => ({
        id: edgeId(e),
        source: e.from,
        target: e.to,
        sourceHandle: e.branch,
        label: e.branch,
      })),
    }
  }, [workflow, moved, selectedNodeId, issues])

  function select(id: string | undefined) {
    onSelectWorkflow?.(id)
    setSelectedNodeId(undefined)
    setNotice('')
  }

  function createWorkflow() {
    const created = addWorkflow(useSchemaStore.getState().project)
    applyToProject(() => created.project)
    select(created.id)
  }

  function onNodesChange(changes: NodeChange[]) {
    if (!workflow) return
    for (const change of changes) {
      if (change.type === 'position' && change.position) {
        const position = change.position
        setMoved((all) => ({ ...all, [`${workflow.id}/${change.id}`]: position }))
      } else if (change.type === 'select' && change.selected) {
        setSelectedNodeId(change.id)
      } else if (change.type === 'remove') {
        applyToProject((p) => removeNode(p, workflow.id, change.id))
        setSelectedNodeId((current) => (current === change.id ? undefined : current))
      }
    }
  }

  function onEdgesChange(changes: EdgeChange[]) {
    if (!workflow) return
    for (const change of changes) {
      if (change.type !== 'remove') continue
      const edge = workflow.edges.find((e) => edgeId(e) === change.id)
      if (edge) applyToProject((p) => disconnect(p, workflow.id, edge.from, edge.to, edge.branch))
    }
  }

  function onConnect(connection: Connection) {
    if (!workflow) return
    const branch = connection.sourceHandle === 'true' || connection.sourceHandle === 'false' ? connection.sourceHandle : undefined
    const result = connect(useSchemaStore.getState().project, workflow.id, connection.source, connection.target, branch)
    setNotice(result.error ?? '')
    if (!result.error) applyToProject(() => result.project)
  }

  function add(type: string) {
    if (!workflow) return
    const result = addNode(useSchemaStore.getState().project, workflow.id, type)
    applyToProject(() => result.project)
    setSelectedNodeId(result.id)
    setNotice('')
  }

  return (
    <div className="wf-editor">
      <aside className="panel wf-side">
        <h2>Workflow</h2>
        <ul className="wf-list">
          {project.workflows.map((w) => (
            <li key={w.id} className="page-item">
              <button type="button" className={w.id === workflow?.id ? 'wf-item wf-item-current' : 'wf-item'} onClick={() => select(w.id)}>
                {w.id} <span className="hint">({w.nodes.length} node)</span>
              </button>
              <button
                type="button"
                aria-label={`Xóa workflow ${w.id}`}
                onClick={() => {
                  if (window.confirm(`Xóa workflow ${w.id}? Các sự kiện đang dùng nó sẽ được gỡ.`)) {
                    applyToProject((p) => removeWorkflow(p, w.id))
                    select(undefined)
                  }
                }}
              >
                Xóa
              </button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={createWorkflow}>
          Tạo workflow
        </button>
        {workflow && (
          <>
            <h3 className="palette-group">Thêm node</h3>
            <ul className="wf-palette">
              {listNodes().map((def) => (
                <li key={def.type}>
                  <button type="button" title={def.description} onClick={() => add(def.type)}>
                    + {def.label}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </aside>

      <section className="wf-main">
        {workflow ? (
          <>
            <div className="wf-flow">
              <ReactFlow
                key={`${workflow.id}-${workflow.nodes.length}`}
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={(_, node) => setSelectedNodeId(node.id)}
                onPaneClick={() => setSelectedNodeId(undefined)}
                deleteKeyCode={['Backspace', 'Delete']}
                fitView
                fitViewOptions={{ maxZoom: 1, padding: 0.3 }}
              >
                <Background />
                <Controls />
              </ReactFlow>
            </div>
            {notice && (
              <p role="alert" className="wf-notice">
                {notice}
              </p>
            )}
            <div className="wf-issues" aria-label="Kiểm tra workflow">
              {issues.length === 0 ? (
                <span className="wf-ok">Workflow hợp lệ</span>
              ) : (
                <ul>
                  {issues.map((issue, i) => (
                    <li key={i}>{issue.message}</li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : (
          <p className="hint">Chưa có workflow nào. Bấm "Tạo workflow" hoặc gắn từ Properties của một Button.</p>
        )}
      </section>

      <aside className="panel">
        <h2>Cấu hình node</h2>
        {workflow && selected ? <NodeConfigPanel workflowId={workflow.id} node={selected} /> : <p className="hint">Chọn một node</p>}
      </aside>
    </div>
  )
}
