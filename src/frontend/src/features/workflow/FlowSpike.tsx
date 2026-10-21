import { Background, Controls, ReactFlow, addEdge, useEdgesState, useNodesState, type Connection, type Edge, type Node } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCallback } from 'react'

const initialNodes: Node[] = [
  { id: 'n1', position: { x: 0, y: 0 }, data: { label: 'Call API' } },
  { id: 'n2', position: { x: 0, y: 120 }, data: { label: 'Navigate' } },
]
const initialEdges: Edge[] = [{ id: 'e1', source: 'n1', target: 'n2' }]

export function FlowSpike() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const onConnect = useCallback((c: Connection) => setEdges((es) => addEdge(c, es)), [setEdges])

  return (
    <div style={{ width: '100%', height: 400 }}>
      <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} fitView>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  )
}
