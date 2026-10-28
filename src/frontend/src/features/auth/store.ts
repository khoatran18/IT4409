import { create } from 'zustand'
import { getTokens, onTokensChange, setTokens } from '../../shared/api'
import { authApi, type User } from './api'

interface AuthState {
  isAuthenticated: boolean
  user: User | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  loadUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: getTokens() !== null,
  user: null,

  async login(email, password) {
    const { user, ...tokens } = await authApi.login({ email, password })
    setTokens(tokens)
    set({ user })
  },

  async register(email, password) {
    const { user, ...tokens } = await authApi.register({ email, password })
    setTokens(tokens)
    set({ user })
  },

  async logout() {
    const tokens = getTokens()
    try {
      if (tokens) await authApi.logout(tokens.refreshToken)
    } finally {
      setTokens(null)
    }
  },

  async loadUser() {
    set({ user: await authApi.me() })
  },
}))

// Token đổi ở bất kỳ đâu (refresh thất bại, đăng xuất) đều cập nhật trạng thái đăng nhập
onTokensChange((tokens) => {
  useAuthStore.setState(
    tokens ? { isAuthenticated: true } : { isAuthenticated: false, user: null },
  )
})
