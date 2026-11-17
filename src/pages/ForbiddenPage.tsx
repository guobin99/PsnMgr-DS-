import { Button, Result, Tag } from 'antd'
import { ArrowLeftOutlined, HomeOutlined, LockOutlined, SafetyOutlined } from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { DASHBOARD_PATH } from '@/config/menu'
import { useAuth } from '@/store/auth'
import { usePermission } from '@/hooks/usePermission'

interface ForbiddenPageProps {
  required?: string
  from?: string
  /** 内嵌在路由出口内渲染（保留主框架与页签） */
  embedded?: boolean
}

/** 403 结果页：展示当前角色、所需权限与回退入口 */
export function ForbiddenPage({ required, from, embedded = false }: ForbiddenPageProps) {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { describe, permissions } = usePermission()

  const requiredCode = required ?? params.get('required') ?? ''
  const fromPath = from ?? params.get('from') ?? ''

  const extra = fromPath
    ? [
        <Button key="back" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          返回上一页
        </Button>,
        <Button key="home" type="primary" icon={<HomeOutlined />} onClick={() => navigate(DASHBOARD_PATH)}>
          返回工作台
        </Button>,
      ]
    : [
        <Button key="home" type="primary" icon={<HomeOutlined />} onClick={() => navigate(DASHBOARD_PATH)}>
          返回工作台
        </Button>,
      ]

  return (
    <div className={embedded ? 'result-card' : 'result-card'} style={embedded ? undefined : { marginTop: 12 }}>
      <Result
        status="403"
        title="403 · 无权访问该页面"
        subTitle={
          <span>
            当前账号（{user?.displayName ?? '—'} / {user?.roleName ?? '—'}）没有访问
            {fromPath ? ` ${fromPath} ` : '该页面'}的权限。若确有业务需要，请联系系统管理员在角色权限中授予对应权限码。
          </span>
        }
        extra={extra}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          {requiredCode && (
            <span className="result-required">
              <LockOutlined />
              所需权限码：<b style={{ marginLeft: 4 }}>{requiredCode}</b>
              <span style={{ color: '#94a3b8' }}>（{describe(requiredCode)}）</span>
            </span>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', maxWidth: 720 }}>
            <Tag icon={<SafetyOutlined />} color="blue" bordered={false}>
              会话有效权限 {permissions.length} 项
            </Tag>
            {permissions.slice(0, 6).map((code) => (
              <Tag key={code} bordered={false} style={{ fontFamily: 'monospace', fontSize: 11 }}>
                {code}
              </Tag>
            ))}
            {permissions.length > 6 && (
              <Tag bordered={false} style={{ fontSize: 11 }}>
                +{permissions.length - 6}
              </Tag>
            )}
          </div>
        </div>
      </Result>
    </div>
  )
}
