import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { LoginPayload, LoginResult, PermissionCode, SessionUser } from '@/types/navigation'
import { login as loginRequest, logoutRequest } from '@/services/auth'
import { UNAUTHORIZED_EVENT } from '@/services/http'
import { readJSON, readString, removeKeys, STORAGE_KEYS, writeJSON, writeString } from '@/utils/storage'

interface AuthContextValue {
  token: string | null
  user: SessionUser | null
  isAuthenticated: boolean
  permissions: PermissionCode[]
  /** 是否因 401 被动失效，登录页据此提示 */
  expired: boolean
  login: (payload: LoginPayload) => Promise<LoginResult>
  logout: () => Promise<void>
  clearExpired: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

/** 会话恢复在一次同步读取中完成，避免首屏先渲染登录页再跳回 */
function restoreSession(): { token: string | null; user: SessionUser | null } {
  const token = readString(STORAGE_KEYS.token)
  const user = readJSON<SessionUser>(STORAGE_KEYS.user)
  if (token && user) return { token, user }
  return { token: null, user: null }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(restoreSession)
  const [token, setToken] = useState<string | null>(initial.token)
  const [user, setUser] = useState<SessionUser | null>(initial.user)
  const [expired, setExpired] = useState(false)

  const clearSession = useCallback(() => {
    setToken(null)
    setUser(null)
    removeKeys(STORAGE_KEYS.token, STORAGE_KEYS.user)
  }, [])

  /** 401 由请求层派发全局事件，这里只清理一次，跳转交给登录守卫 */
  useEffect(() => {
    const handleUnauthorized = () => {
      setExpired(true)
      clearSession()
    }
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)
  }, [clearSession])

  const login = useCallback(async (payload: LoginPayload) => {
    const result = await loginRequest(payload)
    writeString(STORAGE_KEYS.token, result.token)
    writeJSON(STORAGE_KEYS.user, result.user)
    setToken(result.token)
    setUser(result.user)
    setExpired(false)
    return result
  }, [])

  const logout = useCallback(async () => {
    await logoutRequest()
    clearSession()
    setExpired(false)
  }, [clearSession])

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token),
      permissions: user?.permissions ?? [],
      expired,
      login,
      logout,
      clearExpired: () => setExpired(false),
    }),
    [token, user, expired, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth 必须在 AuthProvider 内使用')
  return context
}
