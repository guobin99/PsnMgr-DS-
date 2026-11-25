import { lazy, type ComponentType } from 'react'

/**
 * 业务真实页面注册表：路径 → 懒加载组件。
 * 未注册的路径在路由中回退到通用 ModulePage 占位组件，因此新增页面只需在此登记。
 */
const registry: Record<string, ComponentType> = {
  '/system/operator': lazy(() => import('@/pages/system/OperatorPage')),
  '/system/role': lazy(() => import('@/pages/system/RolePage')),
  '/system/permission': lazy(() => import('@/pages/system/PermissionPage')),
  '/system/dept-right': lazy(() => import('@/pages/system/DeptRightPage')),
  '/system/device-right': lazy(() => import('@/pages/system/DeviceRightPage')),
  '/system/subsystem-right': lazy(() => import('@/pages/system/SubsystemRightPage')),
  '/system/cashier-auth': lazy(() => import('@/pages/system/CashierAuthPage')),

  // 系统配置
  '/system/param': lazy(() => import('@/pages/system/ParamPage')),
  '/system/dict': lazy(() => import('@/pages/system/DictPage')),
  '/system/integration': lazy(() => import('@/pages/system/IntegrationPage')),
  '/system/maintain': lazy(() => import('@/pages/system/MaintainPage')),
  '/system/blacklist': lazy(() => import('@/pages/system/BlacklistPage')),

  // 安全审计
  '/system/log/system': lazy(() => import('@/pages/system/SystemLogPage')),
  '/system/log/login': lazy(() => import('@/pages/system/LoginLogPage')),
  '/system/log/oper': lazy(() => import('@/pages/system/OperLogPage')),
  '/system/log/sync': lazy(() => import('@/pages/system/SyncLogPage')),
}

/** 查找路径对应的真实页面；未注册返回 null，由调用方回退占位组件 */
export function resolvePage(path?: string): ComponentType | null {
  if (!path) return null
  return registry[path] ?? null
}
