import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { getApiError } from '../../../shared/api'
import { Button } from '../../../shared/ui/Button'
import { Input } from '../../../shared/ui/Input'
import './AuthForm.css'

interface AuthFormProps {
  title: string
  submitText: string
  onSubmit: (email: string, password: string) => Promise<void>
  footer: { text: string; linkText: string; to: string }
}

export function AuthForm({ title, submitText, onSubmit, footer }: AuthFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await onSubmit(email, password)
      navigate((location.state as { from?: string } | null)?.from ?? '/', { replace: true })
    } catch (err) {
      const { message, details } = getApiError(err)
      setError(details?.[0]?.message ?? message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>{title}</h1>
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Mật khẩu"
          name="password"
          type="password"
          autoComplete={title === 'Đăng nhập' ? 'current-password' : 'new-password'}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
          <p role="alert" className="auth-form__error">
            {error}
          </p>
        )}
        <Button type="submit" disabled={submitting}>
          {submitText}
        </Button>
        <p>
          {footer.text} <Link to={footer.to}>{footer.linkText}</Link>
        </p>
      </form>
    </div>
  )
}
