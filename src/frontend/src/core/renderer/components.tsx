import type { CSSProperties } from 'react'
import { resolveProps } from '../registry'
import { usePreview } from './context'
import { DataForm, DataTable } from './data-components'
import { RenderChildren } from './RenderNode'
import { registerRenderer, type RendererProps } from './registry'
import { sampleRows } from './sample-data'

const textSize = { sm: 12, md: 16, lg: 24 } as const

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : []
}

export function Text({ node }: RendererProps) {
  const props = resolveProps(node)
  const style: CSSProperties = {
    fontSize: textSize[props.size as keyof typeof textSize] ?? 16,
    fontWeight: props.weight === 'bold' ? 700 : 400,
  }
  return <span style={style}>{String(props.content ?? '')}</span>
}

export function Heading({ node }: RendererProps) {
  const props = resolveProps(node)
  const Tag = `h${Math.min(Math.max(Number(props.level) || 2, 1), 6)}` as 'h1'
  return <Tag className="rp-heading">{String(props.text ?? '')}</Tag>
}

export function Button({ node }: RendererProps) {
  const props = resolveProps(node)
  const { fire } = usePreview()
  return (
    <button
      type="button"
      className={`rp-button rp-${String(props.variant)}`}
      disabled={Boolean(props.disabled)}
      onClick={() => fire(node, 'onClick')}
    >
      {String(props.text ?? '')}
    </button>
  )
}

export function Input({ node }: RendererProps) {
  const props = resolveProps(node)
  return (
    <label className="rp-field">
      {props.label ? <span>{String(props.label)}</span> : null}
      <input type={String(props.type)} placeholder={String(props.placeholder ?? '')} />
    </label>
  )
}

export function Select({ node }: RendererProps) {
  const props = resolveProps(node)
  const { project } = usePreview()
  const entity = project.entities.find((e) => e.name === props.entity)
  const labelField = entity?.fields[0]?.name
  const options =
    strings(props.options).length > 0
      ? strings(props.options)
      : entity && labelField
        ? sampleRows(entity, 5).map((row) => String(row[labelField]))
        : []
  return (
    <label className="rp-field">
      {props.label ? <span>{String(props.label)}</span> : null}
      <select defaultValue="">
        <option value="">-- chọn --</option>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  )
}

export function Checkbox({ node }: RendererProps) {
  const props = resolveProps(node)
  return (
    <label className="rp-field rp-check">
      <input type="checkbox" />
      <span>{String(props.label ?? '')}</span>
    </label>
  )
}

export function Container({ node }: RendererProps) {
  const props = resolveProps(node)
  const style: CSSProperties = { flexDirection: props.direction === 'row' ? 'row' : 'column', gap: Number(props.gap ?? 0) }
  return (
    <div className="rp-container" style={style}>
      <RenderChildren nodes={node.children} />
    </div>
  )
}

export function Card({ node }: RendererProps) {
  const props = resolveProps(node)
  return (
    <section className="rp-card">
      {props.title ? <strong>{String(props.title)}</strong> : null}
      <RenderChildren nodes={node.children} />
    </section>
  )
}

registerRenderer('Text', Text)
registerRenderer('Heading', Heading)
registerRenderer('Button', Button)
registerRenderer('Input', Input)
registerRenderer('Select', Select)
registerRenderer('Checkbox', Checkbox)
registerRenderer('Container', Container)
registerRenderer('Card', Card)
registerRenderer('Table', DataTable)
registerRenderer('Form', DataForm)
