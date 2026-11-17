import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import type { PermissionCode } from '@/types/navigation'
import { usePermission } from '@/hooks/usePermission'
import { ForbiddenPage } from '@/pages/ForbiddenPage'

interface PermissionGateProps {
  permission?: PermissionCode
  children: ReactNode
}

/**
 * 页面级权限守卫：包裹在每条叶子路由外层。
 * 未命中权限时渲染内嵌 403，保留主框架与页签，兜住直连、书签与外部链接。
 */
export function PermissionGate({ permission, children }: PermissionGateProps) {
  const { can } = usePermission()
  const location = useLocation()

  if (!can(permission)) {
    return <ForbiddenPage required={permission} from={location.pathname} embedded />
  }

  return <>{children}</>
}
