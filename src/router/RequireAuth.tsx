import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/store/auth'

/** 登录守卫：未登录时跳转登录页，并把当前地址作为来源记录 */
export function RequireAuth() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    const from = `${location.pathname}${location.search}`
    const target = from && from !== '/' ? `/login?from=${encodeURIComponent(from)}` : '/login'
    return <Navigate to={target} replace />
  }

  return <Outlet />
}
