import type { ComponentNode, ProjectSchema } from '@codeflow/schema'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { PreviewContext, type FireOptions, type PreviewContextValue } from './context'
import { isVisibleTo } from './events'
import { RenderChildren } from './RenderNode'
import { runWorkflow, type MessageKind } from './run-workflow'
import { simulateApi } from './sample-api'
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
  const [message, setMessage] = useState<{ kind: MessageKind; text: string }>()
  const [values, setValues] = useState<Record<string, unknown>>({})

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(undefined), 3000)
    return () => clearTimeout(timer)
  }, [message])

  const menu = project.pages.filter((p) => isVisibleTo(p.requireRole, role))
  const page = project.pages.find((p) => p.id === pageId) ?? menu[0]
  const allowed = page !== undefined && isVisibleTo(page.requireRole, role)

  const setValue = useCallback((name: string, value: unknown) => setValues((all) => ({ ...all, [name]: value })), [])
  // ô nhập thuộc về trang đang xem: đổi trang thì bắt đầu lại từ rỗng
  const goTo = useCallback((id: string) => {
    setPageId(id)
    setValues({})
  }, [])
  const notify = useCallback((text: string, kind: MessageKind = 'info') => setMessage({ kind, text }), [])

  const fire = useCallback(
    async (node: ComponentNode, event: string, options: FireOptions = {}) => {
      const workflowId = node.events?.[event]
      if (!workflowId) return
      const workflow = project.workflows.find((w) => w.id === workflowId)
      if (!workflow) return notify(`Workflow "${workflowId}" không tồn tại`, 'error')
      const run = await runWorkflow(workflow, {
        values: options.values ?? values,
        params: options.params,
        callApi: (call) => simulateApi(project, call),
        message: (kind, text) => notify(text, kind),
        navigate: (to) => {
          const target = project.pages.find((p) => p.route === to)
          if (target) goTo(target.id)
          else notify(`Không có trang "${to}" trong preview`)
        },
      })
      if (!run.ok && run.error) notify(run.error, 'error')
    },
    [project, notify, values, goTo],
  )

  const context = useMemo<PreviewContextValue>(
    () => ({ project, role, values, setValue, notify, fire }),
    [project, role, values, setValue, notify, fire],
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
              onClick={() => goTo(p.id)}
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
          {message && <div className={`rp-toast rp-toast-${message.kind}`} role="status">{message.text}</div>}
        </main>
      </div>
    </PreviewContext.Provider>
  )
}
