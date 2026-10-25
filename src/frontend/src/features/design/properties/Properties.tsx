import { useSchemaStore } from '../../../core/schema-store'

export function Properties() {
  const selectedId = useSchemaStore((s) => s.selectedId)
  const remove = useSchemaStore((s) => s.remove)
  return (
    <aside className="panel">
      <h2>Thuộc tính</h2>
      {selectedId ? (
        <>
          <p>Đang chọn: {selectedId}</p>
          <button type="button" onClick={() => remove(selectedId)}>Xóa</button>
        </>
      ) : (
        <p className="hint">Chọn một component trên canvas</p>
      )}
    </aside>
  )
}
