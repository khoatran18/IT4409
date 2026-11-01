import { useEffect, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuthStore } from '../store'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const hasUser = useAuthStore((s) => s.user !== null)
  const loadUser = useAuthStore((s) => s.loadUser)
  const location = useLocation()

  useEffect(() => {
    if (isAuthenticated && !hasUser) loadUser().catch(() => {})
  }, [isAuthenticated, hasUser, loadUser])

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return children
}
