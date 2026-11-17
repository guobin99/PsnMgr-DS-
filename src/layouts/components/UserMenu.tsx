import { App, Dropdown, Tag, type MenuProps } from 'antd'
import {
  DownOutlined,
  LogoutOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons'
import type { SessionUser } from '@/types/navigation'

interface UserMenuProps {
  user: SessionUser | null
  onLogout: () => void
}

/** 顶栏用户菜单：头像、姓名、角色标签与下拉动作 */
export function UserMenu({ user, onLogout }: UserMenuProps) {
  const { message, modal } = App.useApp()

  const items: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: (
        <span>
          <div style={{ fontSize: 13, color: '#0f172a' }}>{user?.displayName ?? '未登录'}</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>
            {user?.userName} · {user?.deptName}
          </div>
        </span>
      ),
      disabled: true,
    },
    { type: 'divider' },
    { key: 'account', icon: <SettingOutlined />, label: '账号设置' },
    { key: 'help', icon: <QuestionCircleOutlined />, label: '帮助与文档' },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true },
  ]

  const handleClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'account') {
      message.info('账号设置由 CS 操作员档案维护，BS 侧暂不提供自助修改')
    } else if (key === 'help') {
      message.info('接口与权限口径见《布局与导航及权限控制详细设计文档》第九、十章')
    } else if (key === 'logout') {
      modal.confirm({
        title: '退出登录',
        content: '退出后需要重新输入账号密码，未保存的筛选条件将丢失。',
        okText: '退出登录',
        cancelText: '取消',
        okButtonProps: { danger: true },
        onOk: onLogout,
      })
    }
  }

  const initial = (user?.displayName ?? 'U').slice(0, 1)

  return (
    <Dropdown trigger={['click']} menu={{ items, onClick: handleClick }}>
      <div className="app-user">
        <div className="app-user__avatar">{initial}</div>
        <div className="app-user__meta">
          <div className="app-user__name">{user?.displayName ?? '未登录'}</div>
          <div className="app-user__role">
            <Tag
              color="blue"
              bordered={false}
              style={{ fontSize: 10, lineHeight: '16px', marginInlineEnd: 0, padding: '0 6px' }}
            >
              {user?.roleName ?? '—'}
            </Tag>
          </div>
        </div>
        <DownOutlined style={{ fontSize: 10, color: '#94a3b8' }} />
      </div>
    </Dropdown>
  )
}
