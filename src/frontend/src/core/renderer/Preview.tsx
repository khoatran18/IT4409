import type { ComponentNode, ProjectSchema } from '@codeflow/schema'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { PreviewContext, type PreviewContextValue } from './context'
import { isVisibleTo, resolveEvent } from './events'
import { RenderChildren } from './RenderNode'
import './components'
import './renderer.css'

interface PreviewProps {
  project: ProjectSchema
  /** Trang mở đầu tiên; mặc định là trang đầu tiên role được xem */
  initialPageId?: string
}

/** Vẽ app từ schema: menu bên trái như AppLayout của app sinh ra, điều hướng giữa các page bằng state nội bộ. */
export function Preview({ project, initialPageId }: PreviewProps) {
  const [role, setRole] = useState(project.roles[0] ?? 'admin')
  const [pageId, setPageId] = useState(initialPageId)
  const [message, setMessage] = useState<string>()

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(undefined), 3000)
    return () => clearTimeout(timer)
  }, [message])

  const menu = project.pages.filter((p) => isVisibleTo(p.requireRole, role))
  const page = project.pages.find((p) => p.id === pageId) ?? menu[0]
  const allowed = page !== undefined && isVisibleTo(page.requireRole, role)

  const fire = useCallback(
    (node: ComponentNode, event: string) => {
      const action = resolveEvent(project, node.events?.[event])
      if (!action) return
      if (action.kind === 'unsupported') return setMessage(action.message)
      const target = project.pages.find((p) => p.route === action.to)
      if (target) setPageId(target.id)
      else setMessage(`Không có trang "${action.to}" trong preview`)
    },
    [project],
  )

  const context = useMemo<PreviewContextValue>(
    () => ({ project, role, notify: setMessage, fire }),
    [project, role, fire],
  )

  return (
    <PreviewContext.Provider value={context}>
      <div className="rp-app">
        <nav className="rp-sidebar" aria-label="Menu">
          <strong>{project.meta.name}</strong>
          <label className="rp-role">
            <span>Xem với role</span>
            <select aria-label="Xem với role" value={role} onChange={(e) => setRole(e.target.value)}>
              {project.roles.map((r) => <option key={r}>{r}</option>)}
            </select>
          </label>
          {menu.map((p) => (
            <button
              key={p.id}
              type="button"
              className={p.id === page?.id ? 'rp-nav rp-nav-active' : 'rp-nav'}
              onClick={() => setPageId(p.id)}
            >
              {p.title}
            </button>
          ))}
        </nav>
        <main className="rp-content">
          {!page && <p>Project chưa có trang nào</p>}
          {page && !allowed && (
            <div>
              <h1>403</h1>
              <p>Role "{role}" không có quyền xem trang này.</p>
            </div>
          )}
          {page && allowed && (
            <div className="rp-page">
              <RenderChildren nodes={page.components} />
            </div>
          )}
          {message && <div className="rp-toast" role="status">{message}</div>}
        </main>
      </div>
    </PreviewContext.Provider>
  )
}
