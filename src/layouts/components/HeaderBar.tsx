import { useEffect, useState } from 'react'
import { Dropdown, Tooltip, type MenuProps } from 'antd'
import {
  BellOutlined,
  ExpandOutlined,
  FullscreenExitOutlined,
  HomeOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import type { DomainMeta, MenuSearchItem, SessionUser } from '@/types/navigation'
import { DASHBOARD_PATH } from '@/config/menu'
import { DomainSwitch } from './DomainSwitch'
import { GlobalSearch } from './GlobalSearch'
import { UserMenu } from './UserMenu'

interface HeaderBarProps {
  collapsed: boolean
  onToggle: () => void
  domains: DomainMeta[]
  currentDomain?: DomainMeta
  searchIndex: MenuSearchItem[]
  user: SessionUser | null
  onNavigate: (path: string) => void
  onRefresh: () => void
  onLogout: () => void
}

const NOTIFICATIONS = [
  { key: 'n1', title: '3 张待审核的访客预约单', time: '10 分钟前' },
  { key: 'n2', title: '消费终端 C-021 已离线 12 分钟', time: '26 分钟前' },
  { key: 'n3', title: '昨日门禁异常通行 4 条待复核', time: '1 小时前' },
  { key: 'n4', title: '充值与出纳日报已生成', time: '今天 08:00' },
]

/** 顶栏内容行：折叠开关、业务域切换、搜索、刷新、全屏、通知、用户菜单 */
export function HeaderBar({
  collapsed,
  onToggle,
  domains,
  currentDomain,
  searchIndex,
  user,
  onNavigate,
  onRefresh,
  onLogout,
}: HeaderBarProps) {
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await document.documentElement.requestFullscreen()
      }
    } catch {
      /* 浏览器不支持或被拒绝时静默失败 */
    }
  }

  const notices: MenuProps['items'] = [
    ...NOTIFICATIONS.map((item) => ({
      key: item.key,
      label: (
        <span style={{ display: 'flex', flexDirection: 'column', minWidth: 230, padding: '2px 0' }}>
          <span style={{ fontSize: 13, color: '#1e293b' }}>{item.title}</span>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>{item.time}</span>
        </span>
      ),
    })),
    { type: 'divider' as const },
    { key: 'all', label: <span style={{ fontSize: 12, color: '#2f6fed' }}>查看全部待办与通知</span> },
  ]

  return (
    <div className="app-header__bar">
      <Tooltip title={collapsed ? '展开侧边栏' : '折叠侧边栏'} placement="bottomLeft">
        <button type="button" className="app-icon-btn" onClick={onToggle} aria-label="切换侧边栏">
          {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        </button>
      </Tooltip>

      <DomainSwitch domains={domains} current={currentDomain} onSelect={(entry) => onNavigate(entry.entryPath)} />

      <Tooltip title="返回工作台" placement="bottom">
        <button type="button" className="app-icon-btn" onClick={() => onNavigate(DASHBOARD_PATH)} aria-label="工作台">
          <HomeOutlined />
        </button>
      </Tooltip>

      <span className="app-header__spacer" />

      <GlobalSearch index={searchIndex} onSelect={onNavigate} />

      <Tooltip title="刷新当前页" placement="bottom">
        <button type="button" className="app-icon-btn" onClick={onRefresh} aria-label="刷新当前页">
          <ReloadOutlined />
        </button>
      </Tooltip>

      <Tooltip title={fullscreen ? '退出全屏' : '全屏显示'} placement="bottom">
        <button type="button" className="app-icon-btn" onClick={toggleFullscreen} aria-label="全屏">
          {fullscreen ? <FullscreenExitOutlined /> : <ExpandOutlined />}
        </button>
      </Tooltip>

      <Dropdown trigger={['click']} menu={{ items: notices }}>
        <button type="button" className="app-icon-btn app-notice" aria-label="通知">
          <BellOutlined />
          <span className="app-notice__badge">6</span>
        </button>
      </Dropdown>

      <UserMenu user={user} onLogout={onLogout} />
    </div>
  )
}
