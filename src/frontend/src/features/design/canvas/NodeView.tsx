import type { ComponentNode, Entity } from '@codeflow/schema'
import { useDndContext, useDraggable } from '@dnd-kit/core'
import { Fragment, useContext, type CSSProperties } from 'react'
import { get, missingRequired, resolveProps } from '../../../core/registry'
import { sampleValue } from '../../../core/renderer'
import { useSchemaStore } from '../../../core/schema-store'
import { DragLockContext } from './drag'
import { DropZone, InsertSlot } from './DropZone'

export interface NodeDragData {
  nodeId: string
  label: string
}

const textSize = { sm: 12, md: 16, lg: 24 } as const
const alignItems = { start: 'flex-start', center: 'center', end: 'flex-end', stretch: 'stretch' } as const

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : []
}

function ChildList({ node, horizontal }: { node: ComponentNode; horizontal: boolean }) {
  const children = node.children ?? []
  return (
    <>
      {children.map((child, i) => (
        <Fragment key={child.id}>
          <InsertSlot parentId={node.id} index={i} horizontal={horizontal} />
          <NodeView node={child} />
        </Fragment>
      ))}
      {children.length > 0 && <InsertSlot parentId={node.id} index={children.length} horizontal={horizontal} />}
      {children.length === 0 && <span className="hint">Thả component vào đây</span>}
    </>
  )
}

/** Mỗi con của Grid là một ô; khe chèn nằm sát mép trái ô, riêng khe cuối nằm sau ô cuối. */
function GridCells({ node }: { node: ComponentNode }) {
  const children = node.children ?? []
  return (
    <>
      {children.map((child, i) => (
        <div key={child.id} className="pv-grid-cell">
          <InsertSlot parentId={node.id} index={i} horizontal />
          <NodeView node={child} />
          {i === children.length - 1 && <InsertSlot parentId={node.id} index={children.length} horizontal />}
        </div>
      ))}
      {children.length === 0 && <span className="hint">Thả component vào các ô</span>}
    </>
  )
}

function sampleCell(entity: Entity | undefined, column: string, row: number): string {
  const field = entity?.fields.find((f) => f.name === column)
  return field ? String(sampleValue(field, row)) : '…'
}

function Preview({ node }: { node: ComponentNode }) {
  const props = resolveProps(node)
  const entities = useSchemaStore((s) => s.project.entities)
  const entity = entities.find((e) => e.name === props.entity)

  switch (node.type) {
    case 'Text': {
      const style: CSSProperties = {
        fontSize: textSize[props.size as keyof typeof textSize] ?? 16,
        fontWeight: props.weight === 'bold' ? 700 : 400,
      }
      return <span style={style}>{String(props.content ?? '')}</span>
    }
    case 'Heading': {
      const Tag = `h${Math.min(Math.max(Number(props.level) || 2, 1), 6)}` as 'h1'
      return <Tag className="pv-heading">{String(props.text ?? '')}</Tag>
    }
    case 'Button':
      return (
        <button type="button" className={`pv-button pv-${String(props.variant)}`} disabled={Boolean(props.disabled)}>
          {String(props.text ?? '')}
        </button>
      )
    case 'Input':
      return (
        <label className="pv-field">
          {props.label ? <span>{String(props.label)}</span> : null}
          <input type={String(props.type)} placeholder={String(props.placeholder ?? '')} disabled />
        </label>
      )
    case 'Select': {
      const options = strings(props.options)
      return (
        <label className="pv-field">
          {props.label ? <span>{String(props.label)}</span> : null}
          <select disabled>
            <option>{options[0] ?? (props.entity ? `Dữ liệu ${String(props.entity)}` : 'Chưa có lựa chọn')}</option>
          </select>
        </label>
      )
    }
    case 'Checkbox':
      return (
        <label className="pv-field pv-check">
          <input type="checkbox" disabled />
          <span>{String(props.label ?? '')}</span>
        </label>
      )
    case 'Table': {
      const columns = strings(props.columns)
      const actions = strings(props.actions)
      return (
        <table className="pv-table">
          <thead>
            <tr>
              {columns.map((c) => <th key={c}>{c}</th>)}
              {actions.length > 0 && <th />}
              {columns.length === 0 && actions.length === 0 && <th>Chưa chọn cột</th>}
            </tr>
          </thead>
          <tbody>
            {[0, 1].map((row) => (
              <tr key={row}>
                {columns.map((c) => <td key={c}>{sampleCell(entity, c, row)}</td>)}
                {actions.length > 0 && <td>{actions.join(' | ')}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      )
    }
    case 'Form':
      return (
        <div className="pv-form">
          {entity ? (
            entity.fields.map((f) => (
              <label key={f.name} className="pv-field">
                <span>{f.name}</span>
                {f.type === 'ref' ? (
                  <select disabled>
                    <option>{String(sampleValue(f, 0))}</option>
                  </select>
                ) : (
                  <input disabled />
                )}
              </label>
            ))
          ) : (
            <span className="hint">Form: chọn entity</span>
          )}
          <button type="button" className="pv-button pv-primary">{String(props.submitText ?? '')}</button>
        </div>
      )
    case 'Container':
      return (
        <DropZone parentId={node.id} className="pv-container">
          <div
            className="pv-container-body"
            style={{
              flexDirection: props.direction === 'row' ? 'row' : 'column',
              gap: Number(props.gap ?? 0),
              alignItems: alignItems[props.align as keyof typeof alignItems] ?? 'stretch',
              flexWrap: props.wrap ? 'wrap' : 'nowrap',
            }}
          >
            <ChildList node={node} horizontal={props.direction === 'row'} />
          </div>
        </DropZone>
      )
    case 'Grid': {
      const columns = Math.min(Math.max(Math.round(Number(props.columns)) || 2, 1), 4)
      return (
        <DropZone parentId={node.id} className="pv-container">
          <div
            className="pv-grid"
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              gap: Number(props.gap ?? 0),
              alignItems: alignItems[props.align as keyof typeof alignItems] ?? 'stretch',
            }}
          >
            <GridCells node={node} />
          </div>
        </DropZone>
      )
    }
    case 'Card':
      return (
        <DropZone parentId={node.id} className="pv-container pv-card">
          {props.title ? <strong>{String(props.title)}</strong> : null}
          <div className="pv-container-body" style={{ flexDirection: 'column' }}>
            <ChildList node={node} horizontal={false} />
          </div>
        </DropZone>
      )
    default:
      return <span className="hint">{node.type}</span>
  }
}

export function NodeView({ node }: { node: ComponentNode }) {
  const selected = useSchemaStore((s) => s.selectedId === node.id)
  const select = useSchemaStore((s) => s.select)
  const missing = missingRequired(node)
  const parentLocked = useContext(DragLockContext)
  const { active } = useDndContext()
  const data: NodeDragData = { nodeId: node.id, label: get(node.type)?.label ?? node.type }
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: `node-${node.id}`, data })
  const classes = ['node', selected ? 'selected' : '', isDragging ? 'dragging' : '', missing.length > 0 ? 'invalid' : '']
    .filter(Boolean)
    .join(' ')

  return (
    <DragLockContext.Provider value={parentLocked || active?.id === `node-${node.id}`}>
      <div
        ref={setNodeRef}
        className={classes}
        {...listeners}
        {...attributes}
        onClick={(e) => {
          e.stopPropagation()
          select(node.id)
        }}
      >
        <Preview node={node} />
        {missing.length > 0 && <span className="node-warn">Thiếu: {missing.join(', ')}</span>}
      </div>
    </DragLockContext.Provider>
  )
}
