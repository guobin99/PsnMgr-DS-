import { Dropdown, type MenuProps } from 'antd'
import { CheckOutlined, DownOutlined } from '@ant-design/icons'
import type { DomainMeta } from '@/types/navigation'

interface DomainSwitchProps {
  domains: DomainMeta[]
  current?: DomainMeta
  onSelect: (entry: DomainMeta) => void
}

/** 顶栏业务域快速切换：只列出经权限过滤后仍有可见节点的域 */
export function DomainSwitch({ domains, current, onSelect }: DomainSwitchProps) {
  const items: MenuProps['items'] = domains.map((entry) => ({
    key: entry.key,
    label: (
      <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 190 }}>
        <span style={{ color: '#2f6fed', fontSize: 15, display: 'inline-flex' }}>{entry.icon}</span>
        <span style={{ flex: '1 1 auto', fontSize: 13 }}>{entry.label}</span>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>{entry.leafCount} 页</span>
        {current?.key === entry.key && <CheckOutlined style={{ color: '#2f6fed', fontSize: 12 }} />}
      </span>
    ),
  }))

  return (
    <Dropdown
      trigger={['click']}
      menu={{
        items,
        onClick: ({ key }) => {
          const entry = domains.find((item) => item.key === key)
          if (entry) onSelect(entry)
        },
      }}
    >
      <button type="button" className="app-header__domain">
        <span className="app-header__domain-icon">{current?.icon}</span>
        <span className="app-header__domain-label">{current?.label ?? '业务域切换'}</span>
        <DownOutlined className="app-header__domain-caret" />
      </button>
    </Dropdown>
  )
}
