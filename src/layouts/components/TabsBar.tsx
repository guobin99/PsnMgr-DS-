import { Dropdown, Tabs, type MenuProps } from 'antd'
import {
  CloseCircleOutlined,
  CloseOutlined,
  DownOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTabs } from '@/store/tabs'

interface TabsBarProps {
  /** 刷新当前页：由主框架以 replace 方式重新挂载路由出口，不新增页签 */
  onRefresh: () => void
}

/** 多页签：激活态由当前路径推导，工作台固定不可关闭 */
export function TabsBar({ onRefresh }: TabsBarProps) {
  const { tabs, closeTab, closeOthers, closeAll } = useTabs()
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const activeTab = tabs.find((tab) => tab.path === pathname)
  const activeKey = activeTab?.key

  const items = tabs.map((tab) => ({
    key: tab.key,
    closable: tab.closable,
    label: (
      <span>
        {tab.title}
        {tab.domain && tab.domain !== tab.title && (
          <span className="app-tab__domain">· {tab.domain}</span>
        )}
      </span>
    ),
  }))

  const handleClose = (key: string) => {
    const fallback = closeTab(key, pathname)
    if (fallback) navigate(fallback, { replace: true })
  }

  const actions: MenuProps['items'] = [
    { key: 'refresh', icon: <ReloadOutlined />, label: '刷新当前页签' },
    { key: 'close', icon: <CloseOutlined />, label: '关闭当前页签', disabled: !activeTab?.closable },
    { key: 'others', icon: <CloseCircleOutlined />, label: '关闭其他页签', disabled: tabs.length <= 1 },
    { type: 'divider' },
    { key: 'all', icon: <CloseCircleOutlined />, label: '关闭全部页签', danger: true },
  ]

  const onAction: MenuProps['onClick'] = ({ key }) => {
    if (key === 'refresh') {
      onRefresh()
    } else if (key === 'close' && activeKey) {
      handleClose(activeKey)
    } else if (key === 'others' && activeKey) {
      closeOthers(activeKey)
    } else if (key === 'all') {
      navigate(closeAll(), { replace: true })
    }
  }

  return (
    <div className="app-tabsbar">
      <Tabs
        type="editable-card"
        hideAdd
        size="small"
        activeKey={activeKey}
        items={items}
        onChange={(key) => {
          const target = tabs.find((tab) => tab.key === key)
          if (target) navigate(target.path)
        }}
        onEdit={(targetKey, action) => {
          if (action === 'remove') handleClose(String(targetKey))
        }}
      />
      <div className="app-tabsbar__actions">
        <Dropdown trigger={['click']} menu={{ items: actions, onClick: onAction }}>
          <span className="app-tabsbar__action" title="页签操作">
            <DownOutlined />
          </span>
        </Dropdown>
      </div>
    </div>
  )
}
