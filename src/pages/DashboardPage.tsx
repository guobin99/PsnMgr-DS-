import { useMemo } from 'react'
import { Button, Empty, Tag } from 'antd'
import {
  ArrowRightOutlined,
  CalendarOutlined,
  CoffeeOutlined,
  DollarOutlined,
  IdcardOutlined,
  SafetyCertificateOutlined,
  ScheduleOutlined,
  ShoppingCartOutlined,
  ThunderboltOutlined,
  WalletOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import { useNavigate } from 'react-router-dom'
import { buildDomainEntries, filterMenuByPermission, navTree } from '@/config/menu'
import { useAuth } from '@/store/auth'
import { usePermission } from '@/hooks/usePermission'

dayjs.locale('zh-cn')

const WEEK = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const CONSUME_SERIES = [86.2, 92.5, 78.4, 104.8, 118.6, 64.2, 72.4]
const MEAL_SERIES = [52.1, 58.6, 49.2, 66.4, 72.8, 40.6, 45.2]
const Y_MAX = 130

const KPIS = [
  {
    key: 'consume',
    label: '今日消费金额',
    value: '128,640.00',
    unit: '元',
    trend: '+8.6%',
    trendUp: true,
    foot: '昨日同期 118,420.00',
    icon: <ShoppingCartOutlined />,
    color: '#2f6fed',
    bg: '#eaf1ff',
  },
  {
    key: 'recharge',
    label: '今日充值入账',
    value: '52,300.00',
    unit: '元',
    trend: '+12.4%',
    trendUp: true,
    foot: '出纳业务 12 笔',
    icon: <WalletOutlined />,
    color: '#12b3a6',
    bg: '#e6faf7',
  },
  {
    key: 'attendance',
    label: '今日考勤打卡',
    value: '3,182',
    unit: '人次',
    trend: '+0.9%',
    trendUp: true,
    foot: '出勤率 97.6%',
    icon: <ScheduleOutlined />,
    color: '#7c5cff',
    bg: '#f0ecff',
  },
  {
    key: 'access',
    label: '今日门禁通行',
    value: '12,470',
    unit: '人次',
    trend: '-2.1%',
    trendUp: false,
    foot: '异常通行 4 条待复核',
    icon: <SafetyCertificateOutlined />,
    color: '#f59e0b',
    bg: '#fff5e6',
  },
]

function buildChartPath(series: number[], width: number, height: number, padL: number, padR: number, padT: number, padB: number) {
  const innerW = width - padL - padR
  const innerH = height - padT - padB
  const points = series.map((value, index) => {
    const x = padL + (innerW * index) / (series.length - 1)
    const y = padT + innerH * (1 - value / Y_MAX)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  return {
    line: `M${points.join(' L')}`,
    area: `M${points[0]} L${points.join(' L')} L${(padL + innerW).toFixed(1)},${(height - padB).toFixed(1)} L${padL},${(height - padB).toFixed(1)} Z`,
    points,
  }
}

const CHART_W = 720
const CHART_H = 210
const PAD = { l: 34, r: 12, t: 14, b: 24 }

/** 工作台：经营概览、业务域入口、待办与系统状态 */
export function DashboardPage() {
  const { user, permissions } = useAuth()
  const { can } = usePermission()
  const navigate = useNavigate()

  const domains = useMemo(
    () => buildDomainEntries(filterMenuByPermission(navTree, permissions)),
    [permissions],
  )

  const greeting = (() => {
    const hour = dayjs().hour()
    if (hour < 6) return '凌晨好'
    if (hour < 9) return '早上好'
    if (hour < 12) return '上午好'
    if (hour < 14) return '中午好'
    if (hour < 18) return '下午好'
    return '晚上好'
  })()

  const consumeChart = buildChartPath(CONSUME_SERIES, CHART_W, CHART_H, PAD.l, PAD.r, PAD.t, PAD.b)
  const mealChart = buildChartPath(MEAL_SERIES, CHART_W, CHART_H, PAD.l, PAD.r, PAD.t, PAD.b)

  const todos = [
    { key: 't1', text: '访客预约待审核 3 单', time: '10 分钟前', perm: 'visitor:approve:view', path: '/visitor/approve', color: '#2f6fed' },
    { key: 't2', text: '消费纠错待复核 2 笔', time: '26 分钟前', perm: 'consume:correction:view', path: '/consume/correction', color: '#f59e0b' },
    { key: 't3', text: '考勤异常待处理 6 条', time: '1 小时前', perm: 'attendance:adjust:view', path: '/attendance/adjust', color: '#7c5cff' },
    { key: 't4', text: '门禁异常通行待确认 4 条', time: '今天 09:12', perm: 'access:record:abnormal', path: '/access/record/abnormal', color: '#e5484d' },
    { key: 't5', text: '补贴发放待出纳授权 1 批', time: '今天 08:40', perm: 'card:subsidy:view', path: '/card/subsidy', color: '#12b3a6' },
  ].filter((item) => can(item.perm))

  const quickActions = [
    { key: 'q1', label: '人员档案', perm: 'card:person:view', path: '/card/person', icon: <IdcardOutlined /> },
    { key: 'q2', label: '消费流水', perm: 'consume:record:view', path: '/consume/records', icon: <ShoppingCartOutlined /> },
    { key: 'q3', label: '每日考勤', perm: 'attendance:daily:view', path: '/attendance/daily', icon: <CalendarOutlined /> },
    { key: 'q4', label: '门禁控制台', perm: 'access:console:view', path: '/access/console', icon: <SafetyCertificateOutlined /> },
    { key: 'q5', label: '订餐订单', perm: 'meal:order:view', path: '/meal/order', icon: <CoffeeOutlined /> },
    { key: 'q6', label: '系统日志', perm: 'system:log:system', path: '/system/log/system', icon: <ThunderboltOutlined /> },
  ].filter((item) => can(item.perm))

  const statuses = [
    { key: 's1', name: 'CS 数据库（SQL Server）', value: '连接正常 · 12ms', color: '#16a34a' },
    { key: 's2', name: '硬件通讯服务', value: '5188 端口 · 在线', color: '#16a34a' },
    { key: 's3', name: '人脸识别服务', value: '特征库 4,286 条', color: '#16a34a' },
    { key: 's4', name: '消费终端在线', value: '62 / 65 台', color: '#f59e0b' },
    { key: 's5', name: '微信端与小程序', value: 'OpenID / UnionID 已绑定 2,140', color: '#16a34a' },
  ]

  return (
    <div className="dash">
      <section className="dash-hero">
        <div>
          <div className="dash-hero__eyebrow">
            {dayjs().format('YYYY 年 MM 月 DD 日 dddd')} · {user?.deptName ?? '—'}
          </div>
          <h2 className="dash-hero__title">
            {greeting}，{user?.displayName ?? '操作员'}
          </h2>
          <p className="dash-hero__desc">
            当前角色为 <b>{user?.roleName ?? '—'}</b>，可见 {domains.length} 个业务域；导航与按钮已按权限码裁剪，
            无权限页面不会出现在菜单中。
          </p>
        </div>
        <div className="dash-hero__meta">
          <div className="dash-hero__stat">
            <div className="dash-hero__stat-value">{domains.length}</div>
            <div className="dash-hero__stat-label">可见业务域</div>
          </div>
          <div className="dash-hero__stat">
            <div className="dash-hero__stat-value">{domains.reduce((sum, item) => sum + item.leafCount, 0)}</div>
            <div className="dash-hero__stat-label">可访问页面</div>
          </div>
          <div className="dash-hero__stat">
            <div className="dash-hero__stat-value">
              {permissions.includes('*') ? '全部' : permissions.length}
            </div>
            <div className="dash-hero__stat-label">权限码范围</div>
          </div>
        </div>
      </section>

      <div className="dash-kpis">
        {KPIS.map((kpi) => (
          <div key={kpi.key} className="dash-kpi">
            <div className="dash-kpi__top">
              <span className="dash-kpi__label">{kpi.label}</span>
              <span className="dash-kpi__icon" style={{ color: kpi.color, background: kpi.bg }}>
                {kpi.icon}
              </span>
            </div>
            <div className="dash-kpi__value">
              {kpi.value}
              <span className="dash-kpi__unit">{kpi.unit}</span>
            </div>
            <div className="dash-kpi__foot">
              <span className="dash-kpi__trend" style={{ color: kpi.trendUp ? '#16a34a' : '#e5484d' }}>
                {kpi.trendUp ? '▲' : '▼'} {kpi.trend}
              </span>
              <span>{kpi.foot}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="dash-body">
        <div className="dash-col">
          <section className="app-card">
            <div className="app-card__head">
              <span className="app-card__title">近七日消费与订餐趋势</span>
              <span className="dash-legend">
                <span>
                  <i className="dash-legend__dot" style={{ background: '#2f6fed' }} />
                  消费金额（千元）
                </span>
                <span>
                  <i className="dash-legend__dot" style={{ background: '#12b3a6' }} />
                  订餐金额（千元）
                </span>
              </span>
            </div>
            <div className="app-card__body" style={{ paddingTop: 8 }}>
              <svg className="dash-chart" viewBox={`0 0 ${CHART_W} ${CHART_H}`} role="img" aria-label="近七日消费与订餐趋势">
                <defs>
                  <linearGradient id="consumeFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2f6fed" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#2f6fed" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="mealFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#12b3a6" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#12b3a6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[0, 40, 80, 120].map((tick) => {
                  const y = PAD.t + (CHART_H - PAD.t - PAD.b) * (1 - tick / Y_MAX)
                  return (
                    <g key={tick}>
                      <line x1={PAD.l} x2={CHART_W - PAD.r} y1={y} y2={y} stroke="#eef2f8" strokeWidth="1" />
                      <text x={PAD.l - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">
                        {tick}
                      </text>
                    </g>
                  )
                })}
                <path d={consumeChart.area} fill="url(#consumeFill)" />
                <path d={mealChart.area} fill="url(#mealFill)" />
                <path d={mealChart.line} fill="none" stroke="#12b3a6" strokeWidth="2" strokeLinejoin="round" />
                <path d={consumeChart.line} fill="none" stroke="#2f6fed" strokeWidth="2.4" strokeLinejoin="round" />
                {consumeChart.points.map((point, index) => {
                  const [cx, cy] = point.split(',')
                  return <circle key={`c-${WEEK[index]}`} cx={cx} cy={cy} r="3" fill="#fff" stroke="#2f6fed" strokeWidth="2" />
                })}
                {WEEK.map((label, index) => {
                  const x = PAD.l + ((CHART_W - PAD.l - PAD.r) * index) / (WEEK.length - 1)
                  return (
                    <text key={label} x={x} y={CHART_H - 6} textAnchor="middle" fontSize="10" fill="#94a3b8">
                      {label}
                    </text>
                  )
                })}
              </svg>
            </div>
          </section>

          <section className="app-card">
            <div className="app-card__head">
              <span className="app-card__title">业务域入口</span>
              <span className="app-card__extra">仅展示当前角色可见的业务域，共 {domains.length} 个</span>
            </div>
            <div className="app-card__body">
              {domains.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前账号未被授予任何业务域权限" />
              ) : (
                <div className="dash-domains">
                  {domains.map((entry) => (
                    <div key={entry.key} className="dash-domain" onClick={() => navigate(entry.entryPath)}>
                      <span className="dash-domain__icon">{entry.icon}</span>
                      <span style={{ minWidth: 0 }}>
                        <div className="dash-domain__label">{entry.label}</div>
                        <div className="dash-domain__meta">{entry.leafCount} 个页面</div>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="dash-col">
          <section className="app-card">
            <div className="app-card__head">
              <span className="app-card__title">待办提醒</span>
              <Tag bordered={false} color="blue" style={{ marginInlineEnd: 0 }}>
                {todos.length} 项
              </Tag>
            </div>
            <div className="app-card__body" style={{ paddingTop: 8, paddingBottom: 8 }}>
              {todos.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前角色没有待办事项" />
              ) : (
                <div className="dash-todo">
                  {todos.map((item) => (
                    <div key={item.key} className="dash-todo__item" onClick={() => navigate(item.path)}>
                      <span className="dash-todo__dot" style={{ background: item.color }} />
                      <span className="dash-todo__text">{item.text}</span>
                      <span className="dash-todo__time">{item.time}</span>
                      <ArrowRightOutlined style={{ fontSize: 10, color: '#cbd5e1' }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="app-card">
            <div className="app-card__head">
              <span className="app-card__title">常用功能</span>
              <span className="app-card__extra">按权限过滤</span>
            </div>
            <div className="app-card__body">
              {quickActions.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无可用的快捷功能" />
              ) : (
                <div className="dash-quick">
                  {quickActions.map((action) => (
                    <Button key={action.key} icon={action.icon} onClick={() => navigate(action.path)}>
                      {action.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="app-card">
            <div className="app-card__head">
              <span className="app-card__title">系统运行状态</span>
              <span className="app-card__extra">
                <DollarOutlined style={{ marginRight: 4 }} />
                CS 与 BS 并行
              </span>
            </div>
            <div className="app-card__body">
              <div className="dash-status">
                {statuses.map((item) => (
                  <div key={item.key} className="dash-status__row">
                    <span className="dash-status__dot" style={{ background: item.color }} />
                    <span className="dash-status__name">{item.name}</span>
                    <span className="dash-status__value">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
