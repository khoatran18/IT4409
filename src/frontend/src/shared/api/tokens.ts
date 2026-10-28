export interface Tokens {
  accessToken: string
  refreshToken: string
}

const STORAGE_KEY = 'codeflow.tokens'

type Listener = (tokens: Tokens | null) => void
const listeners = new Set<Listener>()

export function getTokens(): Tokens | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw ? (JSON.parse(raw) as Tokens) : null
}

export function setTokens(tokens: Tokens | null) {
  if (tokens) localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens))
  else localStorage.removeItem(STORAGE_KEY)
  listeners.forEach((listener) => listener(tokens))
}

export function onTokensChange(listener: Listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
