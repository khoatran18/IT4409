import { useAuthStore } from '../store'
import { AuthForm } from './AuthForm'

export function LoginPage() {
  const login = useAuthStore((s) => s.login)
  return (
    <AuthForm
      title="Đăng nhập"
      submitText="Đăng nhập"
      onSubmit={login}
      footer={{ text: 'Chưa có tài khoản?', linkText: 'Đăng ký', to: '/register' }}
    />
  )
}
