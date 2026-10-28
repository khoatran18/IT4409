import type { InputHTMLAttributes } from 'react'
import './ui.css'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
}

export function Input({ label, id, ...props }: InputProps) {
  const inputId = id ?? props.name
  return (
    <label className="ui-field" htmlFor={inputId}>
      <span>{label}</span>
      <input id={inputId} className="ui-input" {...props} />
    </label>
  )
}
