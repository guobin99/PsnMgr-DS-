import type { PermissionCode } from '@/types/navigation'

/**
 * 权限匹配：先判空要求，再判空集合，最后按精确、全局通配、前缀通配依次判定。
 * 判定顺序不可调整——无要求即通过，无权限即拒绝。
 */
export function hasPermission(
  permissions: PermissionCode[] | undefined,
  required?: PermissionCode,
): boolean {
  if (!required) return true
  if (!permissions || permissions.length === 0) return false
  return permissions.some((grant) => {
    if (grant === '*') return true
    if (grant === required) return true
    // 前缀通配：card:* 命中 card:person:view，但 card:person 不命中 card:person:view
    if (grant.endsWith(':*') && required.startsWith(grant.slice(0, -1))) return true
    return false
  })
}

/** 任一命中即通过 */
export function hasAnyPermission(
  permissions: PermissionCode[] | undefined,
  required: PermissionCode[],
): boolean {
  if (required.length === 0) return true
  return required.some((code) => hasPermission(permissions, code))
}

/** 全部命中才通过 */
export function hasAllPermissions(
  permissions: PermissionCode[] | undefined,
  required: PermissionCode[],
): boolean {
  return required.every((code) => hasPermission(permissions, code))
}

/** 权限码转面向用户的可读文案：card:person:view → card · person · view */
export function describePermission(code?: PermissionCode): string {
  if (!code) return '—'
  return code.split(':').join(' · ')
}

/**
 * 由页面级权限码派生操作级权限码：
 * card:person:view → card:person:edit；报表类用 export。
 */
export function deriveActionPermission(
  permission: PermissionCode | undefined,
  action: 'edit' | 'delete' | 'export' | 'import' | 'audit' | 'dispatch' | 'cashier' | 'batch',
): PermissionCode {
  const base = (permission ?? '').replace(/:view$/, '')
  return base ? `${base}:${action}` : action
}

/** 权限码的三段拆解，供调试与权限说明展示 */
export function parsePermission(code: PermissionCode): {
  domain: string
  resource: string
  action: string
} {
  const [domain = '', resource = '', action = ''] = code.split(':')
  return { domain, resource, action }
}
