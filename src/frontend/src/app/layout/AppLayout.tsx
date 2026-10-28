import { Link, Outlet, useNavigate } from 'react-router'
import { useAuthStore } from '../../features/auth'
import { Button } from '../../shared/ui/Button'
import './AppLayout.css'

export function AppLayout() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="app-layout">
      <header className="app-layout__header">
        <Link to="/" className="app-layout__brand">
          CodeFlow Studio
        </Link>
        <div className="app-layout__user">
          {user && <span>{user.email}</span>}
          <Button variant="secondary" onClick={handleLogout}>
            Đăng xuất
          </Button>
        </div>
      </header>
      <main className="app-layout__content">
        <Outlet />
      </main>
    </div>
  )
}
