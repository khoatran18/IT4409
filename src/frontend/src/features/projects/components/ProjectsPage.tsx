import { useEffect, useState } from 'react'
import { getApiError } from '../../../shared/api'
import { projectsApi, type ProjectList } from '../api'

export function ProjectsPage() {
  const [result, setResult] = useState<ProjectList | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    projectsApi
      .list()
      .then(setResult)
      .catch((err) => setError(getApiError(err).message))
  }, [])

  return (
    <section>
      <h1>Project của tôi</h1>
      {error && <p role="alert">{error}</p>}
      {!error && !result && <p>Đang tải...</p>}
      {result?.data.length === 0 && <p>Chưa có project nào.</p>}
      {result && result.data.length > 0 && (
        <ul>
          {result.data.map((project) => (
            <li key={project.id}>
              {project.name} (v{project.version}), cập nhật{' '}
              {new Date(project.updatedAt).toLocaleString('vi-VN')}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
