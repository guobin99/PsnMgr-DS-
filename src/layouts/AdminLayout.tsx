import { useEffect, useMemo, useState } from 'react'
import { Grid, Input, Layout } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  DASHBOARD_PATH,
  dashboardNode,
  buildDomainEntries,
  buildMenuSearchIndex,
  filterMenuByPermission,
  findNodeByPath,
  getDomainOf,
  getMenuTrail,
  getOpenKeys,
  navTree,
} from '@/config/menu'
import { useAuth } from '@/store/auth'
import { useTabs } from '@/store/tabs'
import { readString, STORAGE_KEYS, writeString } from '@/utils/storage'
import { BrandLogo } from './components/BrandLogo'
import { SideMenu } from './components/SideMenu'
import { HeaderBar } from './components/HeaderBar'
import { TabsBar } from './components/TabsBar'
import { AppBreadcrumb } from './components/AppBreadcrumb'

const { Header, Content, Sider } = Layout

/**
 * 主框架：侧边栏 / 顶栏 / 多页签 / 内容区。
 * 依赖的只有导航数据与会话状态，不感知任何具体业务。
 */
export function AdminLayout() {
  const screens = Grid.useBreakpoint()
  const { user, permissions, logout } = useAuth()
  const { openTab, reset } = useTabs()
  const location = useLocation()
  const navigate = useNavigate()

  const [collapsed, setCollapsed] = useState(() => readString(STORAGE_KEYS.collapsed) === '1')
  const [keyword, setKeyword] = useState('')
  const [manualOpenKeys, setManualOpenKeys] = useState<string[]>([])
  const [refreshTick, setRefreshTick] = useState(0)

  // lg 断点以下自动折叠为图标栏；恢复宽度后按用户上次状态展开
  const autoCollapsed = screens.lg === false
  const effectiveCollapsed = autoCollapsed || collapsed
  const siderWidth = effectiveCollapsed ? 64 : 240

  const visibleTree = useMemo(() => filterMenuByPermission(navTree, permissions), [permissions])
  const domainEntries = useMemo(() => buildDomainEntries(visibleTree), [visibleTree])
  const searchIndex = useMemo(() => buildMenuSearchIndex(visibleTree), [visibleTree])

  const leaf = findNodeByPath(location.pathname)
  const trail = getMenuTrail(location.pathname)
  const domain = getDomainOf(location.pathname)
  const matchedDomain = domainEntries.find((entry) => entry.key === domain?.key)
  const isDashboard = location.pathname === DASHBOARD_PATH
  const currentDomain =
    matchedDomain ??
    (isDashboard
      ? {
          key: dashboardNode.key,
          label: dashboardNode.label,
          icon: dashboardNode.icon,
          permission: dashboardNode.permission ?? 'dashboard:view',
          description: dashboardNode.description ?? '',
          entryPath: DASHBOARD_PATH,
          leafCount: 1,
        }
      : undefined)
  const selectedKey = leaf?.key
  const pathOpenKeys = getOpenKeys(location.pathname)
  const openKeys = Array.from(new Set([...pathOpenKeys, ...manualOpenKeys]))

  // 路由变化时自动开页签，并清空侧边栏筛选关键词
  useEffect(() => {
    if (leaf?.path) {
      openTab({
        path: leaf.path,
        title: leaf.label,
        domain: trail[0]?.label ?? '工作台',
        closable: leaf.path !== DASHBOARD_PATH,
      })
    }
    setKeyword('')
    setManualOpenKeys([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, openTab])

  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    writeString(STORAGE_KEYS.collapsed, next ? '1' : '0')
  }

  const handleNavigate = (path: string) => {
    if (path !== location.pathname) navigate(path)
  }

  const handleLogout = async () => {
    await logout()
    reset()
    navigate('/login', { replace: true })
  }

  return (
    <Layout className="app-shell">
      <Sider
        className="app-sider"
        theme="dark"
        width={240}
        collapsedWidth={64}
        collapsed={effectiveCollapsed}
        trigger={null}
        style={{ position: 'fixed', top: 0, bottom: 0, left: 0, height: '100vh', overflow: 'hidden' }}
      >
        <BrandLogo collapsed={effectiveCollapsed} />
        {!effectiveCollapsed && (
          <div className="app-sider__filter">
            <Input
              size="small"
              allowClear
              value={keyword}
              prefix={<SearchOutlined />}
              placeholder="筛选菜单"
              onChange={(event) => setKeyword(event.target.value)}
            />
          </div>
        )}
        <div className="app-sider__scroll">
          <SideMenu
            tree={visibleTree}
            collapsed={effectiveCollapsed}
            selectedKey={selectedKey}
            openKeys={openKeys}
            keyword={keyword}
            onOpenChange={setManualOpenKeys}
            onSelectPath={handleNavigate}
          />
        </div>
        <div className="app-sider__footer">
          {effectiveCollapsed ? 'v1.0' : 'v1.0.0 · 与 CS 并行运行'}
        </div>
      </Sider>

      <Layout className="app-main" style={{ marginLeft: siderWidth }}>
        <Header className="app-header">
          <HeaderBar
            collapsed={effectiveCollapsed}
            onToggle={toggleCollapsed}
            domains={domainEntries}
            currentDomain={currentDomain}
            searchIndex={searchIndex}
            user={user}
            onNavigate={handleNavigate}
            onRefresh={() => setRefreshTick((tick) => tick + 1)}
            onLogout={handleLogout}
          />
        </Header>
        <TabsBar onRefresh={() => setRefreshTick((tick) => tick + 1)} />
        <Content className="app-content">
          <AppBreadcrumb />
          <div className="app-page" key={`${location.pathname}-${refreshTick}`}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}
