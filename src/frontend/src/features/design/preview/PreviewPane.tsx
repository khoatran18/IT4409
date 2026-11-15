import { Preview } from '../../../core/renderer'
import { useSchemaStore } from '../../../core/schema-store'

/** Xem trước app từ schema hiện tại; có thể nhúng vào màn hình khác ngoài EditorPage. */
export function PreviewPane({ pageId }: { pageId?: string }) {
  const project = useSchemaStore((s) => s.project)
  return <Preview project={project} initialPageId={pageId} />
}
