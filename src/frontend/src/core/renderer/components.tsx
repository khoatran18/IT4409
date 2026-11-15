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
      onClick={() => void fire(node, 'onClick')}
    >
      {String(props.text ?? '')}
    </button>
  )
}

const alignItems = { start: 'flex-start', center: 'center', end: 'flex-end', stretch: 'stretch' } as const

/** Ô nhập có `bindField` đọc/ghi giá trị trang; không có thì chỉ để xem. */
function useBinding(props: Record<string, unknown>) {
  const { values, setValue } = usePreview()
  const field = typeof props.bindField === 'string' && props.bindField ? props.bindField : undefined
  /** Ghi giá trị và trả về toàn bộ giá trị trang sau khi ghi, để truyền ngay cho workflow của sự kiện onChange */
  const set = (v: unknown) => {
    if (field) setValue(field, v)
    return field ? { ...values, [field]: v } : values
  }
  return { field, value: field ? values[field] : undefined, set }
}

export function Input({ node }: RendererProps) {
  const props = resolveProps(node)
  const { fire } = usePreview()
  const { field, value, set } = useBinding(props)
  return (
    <label className="rp-field">
      {props.label ? <span>{String(props.label)}</span> : null}
      <input
        type={String(props.type)}
        placeholder={String(props.placeholder ?? '')}
        {...(field ? { value: String(value ?? '') } : {})}
        onChange={(e) => {
          void fire(node, 'onChange', { values: set(e.target.value) })
        }}
      />
    </label>
  )
}

export function Select({ node }: RendererProps) {
  const props = resolveProps(node)
  const { project, fire } = usePreview()
  const { field, value, set } = useBinding(props)
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
      <select
        {...(field ? { value: String(value ?? '') } : { defaultValue: '' })}
        onChange={(e) => {
          void fire(node, 'onChange', { values: set(e.target.value) })
        }}
      >
        <option value="">-- chọn --</option>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  )
}

export function Checkbox({ node }: RendererProps) {
  const props = resolveProps(node)
  const { fire } = usePreview()
  const { field, value, set } = useBinding(props)
  return (
    <label className="rp-field rp-check">
      <input
        type="checkbox"
        {...(field ? { checked: Boolean(value) } : {})}
        onChange={(e) => {
          void fire(node, 'onChange', { values: set(e.target.checked) })
        }}
      />
      <span>{String(props.label ?? '')}</span>
    </label>
  )
}

export function Container({ node }: RendererProps) {
  const props = resolveProps(node)
  const style: CSSProperties = {
    flexDirection: props.direction === 'row' ? 'row' : 'column',
    gap: Number(props.gap ?? 0),
    alignItems: alignItems[props.align as keyof typeof alignItems] ?? 'stretch',
    flexWrap: props.wrap ? 'wrap' : 'nowrap',
  }
  return (
    <div className="rp-container" style={style}>
      <RenderChildren nodes={node.children} />
    </div>
  )
}

export function Grid({ node }: RendererProps) {
  const props = resolveProps(node)
  const columns = Math.min(Math.max(Math.round(Number(props.columns)) || 2, 1), 4)
  const style: CSSProperties = {
    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
    gap: Number(props.gap ?? 0),
    alignItems: alignItems[props.align as keyof typeof alignItems] ?? 'stretch',
  }
  return (
    <div className="rp-grid" style={style}>
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
registerRenderer('Grid', Grid)
registerRenderer('Card', Card)
registerRenderer('Table', DataTable)
registerRenderer('Form', DataForm)
