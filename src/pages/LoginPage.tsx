import { useEffect, useState } from 'react'
import { Alert, App, Button, Checkbox, Form, Input, Tag } from 'antd'
import { CheckCircleFilled, LockOutlined, SafetyCertificateOutlined, UserOutlined } from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { DASHBOARD_PATH, navTree } from '@/config/menu'
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '@/config/roles'
import { DEMO_ENABLED } from '@/services/auth'
import { useAuth } from '@/store/auth'
import { readString, removeKeys, STORAGE_KEYS, writeString } from '@/utils/storage'

interface LoginFormValues {
  userName: string
  password: string
  remember: boolean
}

/** 登录页：左侧品牌介绍、右侧表单区；窄屏隐藏左侧 */
export function LoginPage() {
  const [form] = Form.useForm<LoginFormValues>()
  const { login, expired, clearExpired } = useAuth()
  const { message } = App.useApp()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const from = params.get('from') ?? ''
  const safeFrom = from.startsWith('/') && !from.startsWith('//') ? from : ''

  useEffect(() => {
    const remembered = readString(STORAGE_KEYS.loginUserName)
    if (remembered) {
      form.setFieldsValue({ userName: remembered, remember: true })
    }
    return () => clearExpired()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (values: LoginFormValues) => {
    setLoading(true)
    setError(null)
    try {
      const user = await login({ userName: values.userName.trim(), password: values.password })
      if (values.remember) {
        writeString(STORAGE_KEYS.loginUserName, user.userName)
      } else {
        removeKeys(STORAGE_KEYS.loginUserName)
      }
      message.success(`欢迎回来，${user.displayName}（${user.roleName}）`)
      navigate(safeFrom || DASHBOARD_PATH, { replace: true })
    } catch (submitError) {
      const text = submitError instanceof Error ? submitError.message : '登录失败，请稍后重试'
      setError(text)
    } finally {
      setLoading(false)
    }
  }

  const domains = navTree.filter((node) => node.key !== 'dashboard')

  return (
    <div className="login-page">
      <div className="login-brand">
        <div className="login-brand__grid" />
        <div className="login-brand__inner">
          <div className="login-brand__badge">
            <SafetyCertificateOutlined />
            BS 一体化管理平台 · V1.0
          </div>
          <h1 className="login-brand__title">
            一张脸，打通
            <br />
            <em>卡务、消费、考勤与门禁</em>
          </h1>
          <p className="login-brand__desc">
            与 CS 人脸通系统共用同一套 SQL Server 数据库与权限体系，BS 端承载管理与报表、CS 端保留原有业务操作，
            两端并行运行、数据同源。移动端由微信端与小程序承接个人业务。
          </p>
          <div className="login-brand__domains">
            {domains.map((domain) => (
              <span key={domain.key} className="login-brand__domain">
                <span style={{ display: 'inline-flex', fontSize: 14 }}>{domain.icon}</span>
                {domain.label}
              </span>
            ))}
          </div>
          <ul className="login-brand__features">
            <li>
              <CheckCircleFilled />
              <span>三层递进控制：菜单级「看不看得见」、页面级「进不进得去」、操作级「能不能改」</span>
            </li>
            <li>
              <CheckCircleFilled />
              <span>单一数据源：233 个菜单节点派生 187 条业务路由、面包屑、页签与搜索索引</span>
            </li>
            <li>
              <CheckCircleFilled />
              <span>同源数据：与 CS 共用 SQL Server，结构只增不删，权限沿用 CS 角色与权限表</span>
            </li>
          </ul>
        </div>
        <div className="login-brand__foot">
          <span>
            <b>9</b>业务域
          </span>
          <span>
            <b>187</b>业务页面
          </span>
          <span>
            <b>233</b>菜单节点
          </span>
          <span>
            <b>3</b>层权限控制
          </span>
        </div>
      </div>

      <div className="login-panel">
        <div className="login-card">
          <div className="login-card__brand">
            <span className="app-brand__mark">脸</span>
            <span>
              <b>人脸通 · BS 管理平台</b>
              <em>Card · Consume · Access</em>
            </span>
          </div>
          <div className="login-card__eyebrow">Sign in</div>
          <h2 className="login-card__title">登录管理平台</h2>
          <p className="login-card__desc">使用 CS 操作员账号登录，权限与数据范围沿用角色配置。</p>

          {expired && (
            <Alert
              type="warning"
              showIcon
              closable
              style={{ marginBottom: 14 }}
              message="登录状态已失效，请重新登录"
              onClose={clearExpired}
            />
          )}
          {error && (
            <Alert
              type="error"
              showIcon
              closable
              style={{ marginBottom: 14 }}
              message={error}
              description="若为后端未启动，开发环境下可点击下方演示账号直接进入。"
              onClose={() => setError(null)}
            />
          )}

          <Form form={form} layout="vertical" requiredMark={false} onFinish={handleSubmit} initialValues={{ remember: true }}>
            <Form.Item
              label="账号"
              name="userName"
              rules={[{ required: true, message: '请输入操作员账号' }]}
            >
              <Input size="large" autoComplete="username" prefix={<UserOutlined style={{ color: '#94a3b8' }} />} placeholder="操作员账号" />
            </Form.Item>
            <Form.Item
              label="密码"
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password
                size="large"
                autoComplete="current-password"
                prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
                placeholder="登录密码"
              />
            </Form.Item>
            <div className="login-card__row" style={{ marginBottom: 16 }}>
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox>记住账号</Checkbox>
              </Form.Item>
              <Button
                type="link"
                size="small"
                style={{ paddingRight: 0 }}
                onClick={() => message.info('密码由 CS 操作员档案维护，请联系系统管理员重置')}
              >
                忘记密码？
              </Button>
            </div>
            <Button type="primary" htmlType="submit" className="login-card__submit" loading={loading}>
              登录
            </Button>
          </Form>

          {DEMO_ENABLED && (
            <div className="login-demo">
              <div className="login-demo__title">
                <span>演示账号（开发环境）</span>
                <Tag bordered={false} style={{ fontSize: 10, marginInlineEnd: 0 }}>
                  密码 {DEMO_PASSWORD}
                </Tag>
              </div>
              <div className="login-demo__list">
                {DEMO_ACCOUNTS.map((account) => (
                  <button
                    key={account.userName}
                    type="button"
                    className="login-demo__chip"
                    onClick={() => {
                      form.setFieldsValue({ userName: account.userName, password: DEMO_PASSWORD })
                      setError(null)
                      message.info(`已填入 ${account.displayName}（${account.roleName}）`)
                    }}
                  >
                    {account.displayName}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="login-foot">
            人脸通 BS 管理平台 · 与 CS 客户端并行运行
            <br />
            登录、越权访问与高风险操作均在后端留痕
          </div>
        </div>
      </div>
    </div>
  )
}
