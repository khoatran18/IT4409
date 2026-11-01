import { api, type Tokens } from '../../shared/api'

export type Role = 'admin' | 'staff' | 'user'

export interface User {
  id: string
  email: string
  role: Role
}

interface AuthResponse extends Tokens {
  user: User
}

interface Credentials {
  email: string
  password: string
}

export const authApi = {
  async login(credentials: Credentials) {
    const res = await api.post<{ data: AuthResponse }>('/auth/login', credentials)
    return res.data.data
  },
  async register(credentials: Credentials) {
    const res = await api.post<{ data: AuthResponse }>('/auth/register', credentials)
    return res.data.data
  },
  async me() {
    const res = await api.get<{ data: User }>('/auth/me')
    return res.data.data
  },
  async logout(refreshToken: string) {
    await api.post('/auth/logout', { refreshToken })
  },
}
