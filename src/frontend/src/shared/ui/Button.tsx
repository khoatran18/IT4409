import type { ButtonHTMLAttributes } from 'react'
import './ui.css'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return <button className={`ui-button ui-button--${variant} ${className}`} {...props} />
}
