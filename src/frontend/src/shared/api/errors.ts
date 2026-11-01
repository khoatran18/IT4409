import { isAxiosError } from 'axios'

export interface ApiErrorBody {
  code: string
  message: string
  details?: { path: string; message: string }[]
}

export function getApiError(error: unknown): ApiErrorBody {
  if (isAxiosError<{ error?: ApiErrorBody }>(error) && error.response?.data?.error) {
    return error.response.data.error
  }
  return { code: 'NETWORK_ERROR', message: 'Không kết nối được máy chủ' }
}
