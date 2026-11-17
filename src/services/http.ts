import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig } from 'axios'
import type { ApiResult } from '@/types/navigation'
import { readString, STORAGE_KEYS } from '@/utils/storage'

/** 会话失效的全局事件名；由会话上下文统一监听，保证只清理一次 */
export const UNAUTHORIZED_EVENT = 'psnmgr:unauthorized'

export type ApiErrorKind = 'auth' | 'forbidden' | 'network' | 'server'

/** 归一化后的接口错误，页面只需读 message 与 kind */
export class ApiError extends Error {
  readonly code?: string | number
  readonly status?: number
  readonly kind: ApiErrorKind

  constructor(message: string, options: { code?: string | number; status?: number; kind: ApiErrorKind }) {
    super(message)
    this.name = 'ApiError'
    this.code = options.code
    this.status = options.status
    this.kind = options.kind
  }
}

/** 兼容后端不同风格的成功码 */
const SUCCESS_CODES = new Set<string | number>(['0', 0, '200', 200, 'SUCCESS', 'OK', 'success', 'ok'])

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
})

instance.interceptors.request.use((config) => {
  const token = readString(STORAGE_KEYS.token)
  if (token) config.headers.Authorization = `Bearer ${token}`
  config.headers['X-Client'] = 'psnmgr-bs'
  return config
})

instance.interceptors.response.use(
  (response) => {
    const body = response.data
    if (body && typeof body === 'object' && 'code' in (body as Record<string, unknown>)) {
      const result = body as ApiResult<unknown>
      if (!SUCCESS_CODES.has(result.code)) {
        throw new ApiError(result.message || '服务返回异常，请稍后重试', {
          code: result.code,
          kind: 'server',
          status: response.status,
        })
      }
      return result.data
    }
    return body
  },
  (error: AxiosError<Record<string, unknown>>) => {
    const status = error.response?.status
    const body = error.response?.data
    const serverMessage = typeof body?.message === 'string' ? body.message : undefined
    const isLoginRequest = (error.config?.url ?? '').includes('/auth/login')

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      throw new ApiError('网络异常或服务不可用（请求超时）', { kind: 'network', status })
    }
    if (!error.response) {
      throw new ApiError('网络异常或服务不可用', { kind: 'network' })
    }
    // 开发代理在后端未启动时返回 5xx 且响应体不是统一返回体，按“服务未启动”处理
    const structured = Boolean(body) && typeof body === 'object'
    if (status !== undefined && status >= 500 && !structured) {
      throw new ApiError('网络异常或服务不可用（后端未启动）', { kind: 'network', status })
    }
    if (status === 401) {
      if (!isLoginRequest) {
        window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT))
        throw new ApiError('登录状态已失效，请重新登录', { kind: 'auth', status })
      }
      throw new ApiError(serverMessage || '账号或密码错误，请重试', { kind: 'auth', status })
    }
    if (status === 403) {
      throw new ApiError(serverMessage || '无权限访问该资源', { kind: 'forbidden', status })
    }
    throw new ApiError(serverMessage || `服务返回异常（${status}）`, { kind: 'server', status })
  },
)

const client = instance as unknown as AxiosInstance

/** 统一请求入口：响应拦截器已解包为数据部分 */
export const api = {
  get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    return client.request({ url, method: 'GET', params }) as unknown as Promise<T>
  },
  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return client.request({ url, method: 'POST', data, ...config }) as unknown as Promise<T>
  },
}
