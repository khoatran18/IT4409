import { useState } from 'react'
import {
  addPage,
  createPageFromEntity,
  findComponent,
  movePage,
  removePage,
  renamePage,
  setRequireRole,
  setRoute,
  useSchemaStore,
  type PageKind,
  type PageResult,
} from '../../../core/schema-store'

interface PagesPanelProps {
  pageId: string | undefined
  onSelect: (pageId: string) => void
}

interface TextFieldProps {
  id: string
  label: string
  value: string
  onCommit: (value: string) => void
}

/** Ô nhập chỉ ghi vào schema khi rời ô hoặc nhấn Enter, để route đang gõ dở không bị validate từng ký tự. */
function CommitField({ id, label, value, onCommit }: TextFieldProps) {
  const [draft, setDraft] = useState(value)
  return (
    <div className="prop">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => draft !== value && onCommit(draft)}
        onKeyDown={(e) => e.key === 'Enter' && onCommit(draft)}
      />
    </div>
  )
}

function applyProject(project: PageResult['project']) {
  const { selectedId } = useSchemaStore.getState()
  useSchemaStore.setState({ project, selectedId: selectedId && findComponent(project, selectedId) ? selectedId : null })
}

export function PagesPanel({ pageId, onSelect }: PagesPanelProps) {
  const project = useSchemaStore((s) => s.project)
  const [notice, setNotice] = useState<{ text: string; error: boolean }>()
  const [entityName, setEntityName] = useState('')
  const [kind, setKind] = useState<PageKind>('list')
  const page = project.pages.find((p) => p.id === pageId) ?? project.pages[0]
  const entity = entityName || project.entities[0]?.name || ''

  function apply(result: PageResult, select = false) {
    if (result.error) return setNotice({ text: result.error, error: true })
    applyProject(result.project)
    setNotice(undefined)
    if (select && result.id) onSelect(result.id)
  }

  function remove(id: string) {
    const target = project.pages.find((p) => p.id === id)
    if (target && target.components.length > 0 && !window.confirm(`Xóa trang "${target.title}" cùng các component của nó?`)) return
    const result = removePage(project, id)
    apply(result)
    if (!result.error && result.dangling > 0) {
      setNotice({ text: `Đã xóa; ${result.dangling} workflow vẫn điều hướng tới route cũ`, error: false })
    }
  }

  return (
    <aside className="panel pages-panel">
      <h2>Trang</h2>
      <ul className="page-list">
        {project.pages.map((p, i) => (
          <li key={p.id} className={p.id === page?.id ? 'page-item page-current' : 'page-item'}>
            <button type="button" className="page-name" onClick={() => onSelect(p.id)}>
              {p.title} <span className="hint">{p.route}</span>
            </button>
            <button type="button" aria-label={`Đưa ${p.title} lên`} disabled={i === 0} onClick={() => applyProject(movePage(project, p.id, 'up'))}>
              ↑
            </button>
            <button
              type="button"
              aria-label={`Đưa ${p.title} xuống`}
              disabled={i === project.pages.length - 1}
              onClick={() => applyProject(movePage(project, p.id, 'down'))}
            >
              ↓
            </button>
            <button type="button" aria-label={`Xóa ${p.title}`} onClick={() => remove(p.id)}>
              ✕
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => apply(addPage(project), true)}>
        Thêm trang
      </button>

      {project.entities.length > 0 && (
        <div className="prop page-from-entity">
          <label htmlFor="page-entity">Tạo trang từ entity</label>
          <select id="page-entity" value={entity} onChange={(e) => setEntityName(e.target.value)}>
            {project.entities.map((e) => <option key={e.name}>{e.name}</option>)}
          </select>
          <select aria-label="Loại trang" value={kind} onChange={(e) => setKind(e.target.value as PageKind)}>
            <option value="list">Danh sách (List)</option>
            <option value="form">Biểu mẫu (Form)</option>
          </select>
          <button type="button" onClick={() => apply(createPageFromEntity(project, entity, kind), true)}>
            Tạo trang
          </button>
        </div>
      )}

      {notice && <p className={notice.error ? 'prop-error' : 'hint'} role="alert">{notice.text}</p>}

      {page && (
        <section className="page-settings" key={page.id}>
          <h3 className="settings-title">Cài đặt trang</h3>
          <CommitField
            key={`title:${page.title}`}
            id="page-title"
            label="Tên trang"
            value={page.title}
            onCommit={(v) => apply(renamePage(project, page.id, v))}
          />
          <CommitField
            key={`route:${page.route}`}
            id="page-route"
            label="Route"
            value={page.route}
            onCommit={(v) => apply(setRoute(project, page.id, v))}
          />
          <div className="prop">
            <span>Role được xem (không chọn = mọi người)</span>
            <div className="prop-checks">
              {project.roles.map((role) => (
                <label key={role}>
                  <input
                    type="checkbox"
                    checked={page.requireRole.includes(role)}
                    onChange={(e) =>
                      apply(
                        setRequireRole(
                          project,
                          page.id,
                          e.target.checked ? [...page.requireRole, role] : page.requireRole.filter((r) => r !== role),
                        ),
                      )
                    }
                  />
                  {role}
                </label>
              ))}
            </div>
          </div>
        </section>
      )}
    </aside>
  )
}
