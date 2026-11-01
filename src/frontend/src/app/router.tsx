import { createBrowserRouter, Navigate } from 'react-router'
import { EditorPage } from '../features/design'
import { LoginPage, ProtectedRoute, RegisterPage } from '../features/auth'
import { ProjectsPage } from '../features/projects'
import { AppLayout } from './layout/AppLayout'

/** Thêm route mới của Studio vào `children` của AppLayout (cần đăng nhập). */
export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/projects" replace /> },
      { path: 'projects', element: <ProjectsPage /> },
      { path: 'projects/:id/editor', element: <EditorPage /> },
    ],
  },
])
