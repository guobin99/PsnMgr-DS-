import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from '@/layouts/AdminLayout'
import { PageLoading } from '@/components/PageLoading'
import { LoginPage } from '@/pages/LoginPage'
import { ForbiddenPage } from '@/pages/ForbiddenPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import {
  DASHBOARD_PATH,
  filterMenuByPermission,
  flattenLeaves,
  navTree,
  resolveDomainEntry,
} from '@/config/menu'
import { useAuth } from '@/store/auth'
import { RequireAuth } from './RequireAuth'
import { PermissionGate } from './PermissionGate'
import { resolvePage } from './pageRegistry'

const DashboardPage = lazy(() =>
  import('@/pages/DashboardPage').then((module) => ({ default: module.DashboardPage })),
)
const ModulePage = lazy(() =>
  import('@/pages/ModulePage').then((module) => ({ default: module.ModulePage })),
)

/** 业务域根路径重定向到该域第一个可见叶子，保持「进入该域」的直觉 */
function DomainRedirect({ domainKey }: { domainKey: string }) {
  const { permissions } = useAuth()
  const target = resolveDomainEntry(domainKey, filterMenuByPermission(navTree, permissions))
  return <Navigate to={target} replace />
}

/** 187 条业务路由由导航树派生，路由文件只负责装配守卫与懒加载边界 */
const leafRoutes = flattenLeaves(navTree)
  .filter((leaf) => leaf.path && leaf.path !== DASHBOARD_PATH)
  .map((leaf) => {
    // 已实现真实页面的路径走注册表，其余仍渲染通用占位页
    const RealPage = resolvePage(leaf.path)
    return (
      <Route
        key={leaf.path}
        path={leaf.path!.replace(/^\//, '')}
        element={
          <PermissionGate permission={leaf.permission}>
            <Suspense fallback={<PageLoading />}>
              {RealPage ? <RealPage /> : <ModulePage />}
            </Suspense>
          </PermissionGate>
        }
      />
    )
  })

const domainRoutes = navTree
  .filter((node) => node.key !== 'dashboard')
  .map((node) => <Route key={node.key} path={node.key} element={<DomainRedirect domainKey={node.key} />} />)

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<AdminLayout />}>
            <Route index element={<Navigate to={DASHBOARD_PATH} replace />} />
            <Route
              path="dashboard"
              element={
                <PermissionGate permission="dashboard:view">
                  <Suspense fallback={<PageLoading label="工作台加载中…" />}>
                    <DashboardPage />
                  </Suspense>
                </PermissionGate>
              }
            />
            {domainRoutes}
            {leafRoutes}
            <Route path="403" element={<ForbiddenPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
