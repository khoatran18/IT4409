import type { Entity, Field } from '@codeflow/schema'

export type SampleRow = Record<string, string | number | boolean> & { id: string }

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Giá trị giả theo kiểu field, xác định theo `index` để preview không nhấp nháy giữa các lần vẽ. */
export function sampleValue(field: Field, index: number): string | number | boolean {
  const n = index + 1
  switch (field.type) {
    case 'string':
      return /email/i.test(field.name) ? `user${n}@example.com` : `${field.name} ${n}`
    case 'text':
      return `Mô tả mẫu cho bản ghi ${n}`
    case 'number':
      return ((index * 37 + field.name.length * 11) % 90) + 10
    case 'boolean':
      return index % 2 === 0
    case 'date':
      return `2025-${pad((index % 12) + 1)}-${pad((index % 28) + 1)}`
    case 'enum':
      return field.options?.length ? field.options[index % field.options.length] : ''
  }
}

export function sampleRows(entity: Entity, count = 23): SampleRow[] {
  return Array.from({ length: count }, (_, index) => {
    const row: SampleRow = { id: `sample-${index + 1}` }
    for (const field of entity.fields) row[field.name] = sampleValue(field, index)
    return row
  })
}

export function formatCell(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Có' : 'Không'
  return value === undefined || value === null ? '' : String(value)
}
