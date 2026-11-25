import { useCallback, useMemo } from 'react'
import type { PermissionCode } from '@/types/navigation'
import { useAuth } from '@/store/auth'
import { describePermission, hasAnyPermission, hasPermission } from '@/utils/permission'

/** 操作级权限判定的页面级封装：优先隐藏而非置灰 */
export function usePermission() {
  const { permissions, user } = useAuth()

  const can = useCallback((required?: PermissionCode) => hasPermission(permissions, required), [permissions])
  const canAny = useCallback(
    (required: PermissionCode[]) => hasAnyPermission(permissions, required),
    [permissions],
  )
  const canAll = useCallback(
    (required: PermissionCode[]) => required.every((code) => hasPermission(permissions, code)),
    [permissions],
  )

  return useMemo(
    () => ({
      permissions,
      user,
      can,
      canAny,
      canAll,
      /** 与主前端页面保持一致的别名：按权限码判定单个操作是否可见 */
      has: can,
      describe: describePermission,
    }),
    [permissions, user, can, canAny, canAll],
  )
}
