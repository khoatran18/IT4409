import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { getTokens, setTokens, type Tokens } from './tokens'

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1'

export const api = axios.create({ baseURL: API_BASE_URL })

api.interceptors.request.use((config) => {
  const tokens = getTokens()
  if (tokens) config.headers.Authorization = `Bearer ${tokens.accessToken}`
  return config
})

// Nhiều request cùng 401 chỉ gọi refresh một lần
let refreshing: Promise<Tokens> | null = null

function refreshTokens(refreshToken: string): Promise<Tokens> {
  refreshing ??= axios
    .post<{ data: Tokens }>(`${API_BASE_URL}/auth/refresh`, { refreshToken })
    .then((res) => {
      const { accessToken, refreshToken } = res.data.data
      const tokens = { accessToken, refreshToken }
      setTokens(tokens)
      return tokens
    })
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean }

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined
    const tokens = getTokens()
    const isAuthCall = /^\/auth\/(login|register|refresh)/.test(original?.url ?? '')

    if (error.response?.status !== 401 || !original || original._retried || !tokens || isAuthCall) {
      throw error
    }

    original._retried = true
    try {
      const fresh = await refreshTokens(tokens.refreshToken)
      original.headers.Authorization = `Bearer ${fresh.accessToken}`
      return await api(original)
    } catch {
      setTokens(null)
      throw error
    }
  },
)
