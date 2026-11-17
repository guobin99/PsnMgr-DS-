import { Breadcrumb } from 'antd'
import { HomeOutlined } from '@ant-design/icons'
import { Link, useLocation } from 'react-router-dom'
import { getBreadcrumbs } from '@/config/menu'

/** 面包屑：由路径反查导航链路；分组节点无路径，不可点击 */
export function AppBreadcrumb() {
  const { pathname } = useLocation()
  const crumbs = getBreadcrumbs(pathname)

  const items = crumbs.map((crumb, index) => {
    const isLast = index === crumbs.length - 1
    if (index === 0 && crumb.path) {
      return {
        key: crumb.key,
        title: (
          <Link to={crumb.path}>
            <HomeOutlined style={{ marginRight: 4 }} />
            {crumb.label}
          </Link>
        ),
      }
    }
    if (isLast) {
      return { key: crumb.key, title: <span style={{ color: '#64748b' }}>{crumb.label}</span> }
    }
    return { key: crumb.key, title: crumb.label }
  })

  return (
    <div className="app-crumbs">
      <Breadcrumb items={items} />
    </div>
  )
}
