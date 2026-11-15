import type { Entity, Field } from '@codeflow/schema'
import { useMemo, useState, type FormEvent } from 'react'
import { resolveProps } from '../registry'
import { usePreview } from './context'
import type { RendererProps } from './registry'
import { formatCell, sampleRows, type SampleRow } from './sample-data'

function useEntity(name: unknown): Entity | undefined {
  const { project } = usePreview()
  return project.entities.find((e) => e.name === name)
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : []
}

function Warning({ children }: { children: string }) {
  return <div className="rp-unknown">{children}</div>
}

export function DataTable({ node }: RendererProps) {
  const props = resolveProps(node)
  const { notify, fire } = usePreview()
  const entity = useEntity(props.entity)
  const seed = useMemo(() => (entity ? sampleRows(entity) : []), [entity])
  const [rows, setRows] = useState<SampleRow[]>(seed)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  if (!entity) return <Warning>Table: chưa chọn entity</Warning>
  const columns = strings(props.columns).filter((c) => entity.fields.some((f) => f.name === c))
  if (columns.length === 0) return <Warning>Table: chưa chọn cột</Warning>

  const actions = strings(props.actions)
  const pageSize = Math.max(1, Number(props.pageSize) || 10)
  const needle = query.trim().toLowerCase()
  const filtered = needle
    ? rows.filter((row) => columns.some((c) => formatCell(row[c]).toLowerCase().includes(needle)))
    : rows
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const current = Math.min(page, pages)
  const visible = filtered.slice((current - 1) * pageSize, current * pageSize)

  return (
    <div className="rp-table-wrap">
      <input
        type="search"
        className="rp-search"
        placeholder="Tìm kiếm"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setPage(1)
        }}
      />
      <table className="rp-table">
        <thead>
          <tr>
            {columns.map((c) => <th key={c}>{c}</th>)}
            {actions.length > 0 && <th />}
          </tr>
        </thead>
        <tbody>
          {visible.map((row) => (
            <tr key={row.id} onClick={() => fire(node, 'onRowClick')}>
              {columns.map((c) => <td key={c}>{formatCell(row[c])}</td>)}
              {actions.length > 0 && (
                <td className="rp-actions">
                  {actions.includes('edit') && (
                    <button type="button" onClick={(e) => { e.stopPropagation(); notify('Sửa bản ghi (giả lập)') }}>
                      Sửa
                    </button>
                  )}
                  {actions.includes('delete') && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setRows((all) => all.filter((r) => r.id !== row.id))
                      }}
                    >
                      Xóa
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
          {visible.length === 0 && (
            <tr>
              <td colSpan={columns.length + 1}>Không có dữ liệu</td>
            </tr>
          )}
        </tbody>
      </table>
      <div className="rp-pager">
        <button type="button" disabled={current <= 1} onClick={() => setPage(current - 1)}>Trước</button>
        <span>Trang {current} / {pages}</span>
        <button type="button" disabled={current >= pages} onClick={() => setPage(current + 1)}>Sau</button>
      </div>
    </div>
  )
}

type Values = Record<string, string | boolean>

function initialValues(entity: Entity, editing: boolean): Values {
  const seed = editing ? sampleRows(entity, 1)[0] : undefined
  return Object.fromEntries(
    entity.fields.map((f) => [f.name, seed ? (seed[f.name] as string | boolean) : f.type === 'boolean' ? false : String(f.default ?? '')]),
  )
}

function validateField(field: Field, value: string | boolean | undefined): string | undefined {
  if (field.type === 'boolean') return undefined
  const text = String(value ?? '').trim()
  if (text === '') return field.required ? 'Bắt buộc nhập' : undefined
  if (field.type === 'number' && Number.isNaN(Number(text))) return 'Phải là số'
  return undefined
}

function FieldInput({ field, value, onChange }: { field: Field; value: string | boolean; onChange: (v: string | boolean) => void }) {
  if (field.type === 'boolean') {
    return <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
  }
  if (field.type === 'text') {
    return <textarea rows={3} value={String(value)} onChange={(e) => onChange(e.target.value)} />
  }
  if (field.type === 'enum') {
    return (
      <select value={String(value)} onChange={(e) => onChange(e.target.value)}>
        <option value="">-- chọn --</option>
        {(field.options ?? []).map((o) => <option key={o}>{o}</option>)}
      </select>
    )
  }
  const type = field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'
  return <input type={type} value={String(value)} onChange={(e) => onChange(e.target.value)} />
}

export function DataForm({ node }: RendererProps) {
  const props = resolveProps(node)
  const { notify, fire } = usePreview()
  const entity = useEntity(props.entity)
  const editing = props.mode === 'edit'
  const [values, setValues] = useState<Values>(() => (entity ? initialValues(entity, editing) : {}))
  const [errors, setErrors] = useState<Record<string, string>>({})

  if (!entity) return <Warning>Form: chưa chọn entity</Warning>

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!entity) return
    const next: Record<string, string> = {}
    for (const field of entity.fields) {
      const error = validateField(field, values[field.name])
      if (error) next[field.name] = error
    }
    setErrors(next)
    if (Object.keys(next).length > 0) return
    notify(`Đã lưu ${entity.name} (giả lập)`)
    fire(node, 'onSubmit')
  }

  return (
    <form className="rp-form" onSubmit={submit} noValidate>
      {entity.fields.map((field) => (
        <label key={field.name} className={field.type === 'boolean' ? 'rp-field rp-check' : 'rp-field'}>
          <span>
            {field.name}
            {field.required ? ' *' : ''}
          </span>
          <FieldInput
            field={field}
            value={values[field.name] ?? ''}
            onChange={(v) => setValues((all) => ({ ...all, [field.name]: v }))}
          />
          {errors[field.name] && <span className="rp-error">{errors[field.name]}</span>}
        </label>
      ))}
      <button type="submit" className="rp-button rp-primary">{String(props.submitText ?? 'Lưu')}</button>
    </form>
  )
}
