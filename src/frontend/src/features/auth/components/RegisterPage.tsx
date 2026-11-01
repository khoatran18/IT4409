import { useAuthStore } from '../store'
import { AuthForm } from './AuthForm'

export function RegisterPage() {
  const register = useAuthStore((s) => s.register)
  return (
    <AuthForm
      title="Đăng ký"
      submitText="Tạo tài khoản"
      onSubmit={register}
      footer={{ text: 'Đã có tài khoản?', linkText: 'Đăng nhập', to: '/login' }}
    />
  )
}
