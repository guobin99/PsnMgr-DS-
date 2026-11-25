import type { LoginPayload, LoginResult, SessionUser } from '@/types/navigation'
import { buildDemoUser, findDemoAccount, resolveDemoPermissions } from '@/config/roles'
import { api, ApiError } from './http'

/** 演示登录开关：生产构建由 .env.production 关闭 */
export const DEMO_ENABLED = import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true'

type RawRecord = Record<string, unknown>

function pickString(source: RawRecord, keys: string[]): string {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number') return String(value)
  }
  return ''
}

function pickArray(source: RawRecord, keys: string[]): string[] {
  for (const key of keys) {
    const value = source[key]
    if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string')
  }
  return []
}

/**
 * 后端用户对象 → 会话用户。
 * 同时兼容文档约定的 camelCase 返回体与现有 .NET 服务返回的 ST_UserInfo 原始字段。
 */
function normalizeUser(raw: RawRecord, fallbackUserName: string): SessionUser {
  const userName = pickString(raw, ['userName', 'User_No', 'userNo', 'User_Name']) || fallbackUserName
  const demo = findDemoAccount(userName)
  return {
    userId: pickString(raw, ['userId', 'User_Id', 'User_No', 'id']) || `U${userName.toUpperCase()}`,
    userName,
    displayName:
      pickString(raw, ['displayName', 'Real_Name', 'User_Name', 'userName']) ||
      demo?.displayName ||
      userName,
    roleNo: pickString(raw, ['roleNo', 'Role_No']) || demo?.roleNo || 'R_CUSTOM',
    roleName: pickString(raw, ['roleName', 'Role_Name']) || demo?.roleName || '普通操作员',
    deptName: pickString(raw, ['deptName', 'Dept_Name']) || demo?.deptName || '—',
    permissions: pickArray(raw, ['permissions', 'Permissions', 'rights', 'rightCodes']),
  }
}

function demoLogin(userName: string): LoginResult {
  const account = findDemoAccount(userName)
  if (!account) {
    throw new ApiError('演示账号未配置，无法回退登录', { kind: 'server' })
  }
  return {
    token: `demo-token.${account.userName}.${Date.now()}`,
    user: buildDemoUser(account),
  }
}

/**
 * 登录：请求体同时携带 userName 与 userNo，兼容文档约定与现有后端模型。
 * 网络异常（超时、服务未启动、跨域）且演示开关开启时回退到本地演示账号；
 * 后端明确返回鉴权失败时绝不回退，直接暴露真实错误。
 */
export async function login(payload: LoginPayload): Promise<LoginResult> {
  try {
    const data = await api.post<RawRecord>('/auth/login', {
      userName: payload.userName,
      userNo: payload.userName,
      password: payload.password,
    })
    const token = pickString(data, ['token', 'access_token', 'accessToken'])
    if (!token) {
      throw new ApiError('服务返回异常：登录响应缺少令牌', { kind: 'server' })
    }
    const rawUser = (data.user ?? data.st_userinfo ?? {}) as RawRecord
    const user = normalizeUser(rawUser, payload.userName)
    if (user.permissions.length === 0) {
      const fallback = DEMO_ENABLED ? resolveDemoPermissions(payload.userName) : []
      user.permissions = fallback.length > 0 ? fallback : ['dashboard:view']
    }
    return { token, user, mustChangePassword: data.mustChangePassword === true }
  } catch (error) {
    if (DEMO_ENABLED && error instanceof ApiError && error.kind === 'network') {
      return demoLogin(payload.userName)
    }
    throw error
  }
}

/** 取当前用户档案与权限集合（凭令牌） */
export async function fetchProfile(): Promise<SessionUser> {
  const data = await api.post<RawRecord>('/auth/profile')
  const user = normalizeUser((data.user ?? data) as RawRecord, '')
  if (user.permissions.length === 0) {
    const fallback = DEMO_ENABLED ? resolveDemoPermissions(user.userName) : []
    user.permissions = fallback.length > 0 ? fallback : ['dashboard:view']
  }
  return user
}

/** 退出登录：无论成功与否都继续本地清理 */
export async function logoutRequest(): Promise<void> {
  try {
    await api.post('/auth/logout')
  } catch {
    /* 退出接口失败不阻断本地清理 */
  }
}

/** 修改密码：临时密码或被重置后的首次改密走此接口，成功后后端吊销全部令牌 */
export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  await api.post('/auth/change-password', { oldPassword, newPassword })
}
