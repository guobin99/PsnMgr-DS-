/**
 * 本地存储封装：统一 psnmgr 前缀，全部读写带异常兜底。
 * 存储不可用（隐私模式、配额已满）或数据解析失败时返回空值，不向上抛错。
 */
export const STORAGE_KEYS = {
  token: 'psnmgr.auth.token',
  user: 'psnmgr.auth.user',
  collapsed: 'psnmgr.layout.collapsed',
  theme: 'psnmgr.layout.theme',
  loginUserName: 'psnmgr.login.userName',
} as const

export function readString(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeString(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* 忽略写入失败，内存态仍然可用 */
  }
}

export function readJSON<T>(key: string): T | null {
  const raw = readString(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    writeString(key, JSON.stringify(value))
  } catch {
    /* 忽略序列化失败 */
  }
}

export function removeKeys(...keys: string[]): void {
  for (const key of keys) {
    try {
      window.localStorage.removeItem(key)
    } catch {
      /* 忽略移除失败 */
    }
  }
}
