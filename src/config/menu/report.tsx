// 报表中心导航（2 个分组、9 个页面）
import { BarChartOutlined } from '@ant-design/icons'
import { defineDomain } from './builder'

export const reportDomain = defineDomain({
  key: 'report',
  label: '报表中心',
  icon: <BarChartOutlined />,
  permission: 'report:view',
  description: '运营财务消费考勤门禁订餐综合报表与报表工具',
  groups: [
    {
      key: 'operation',
      title: '综合运营',
      leaves: [
        ['运营总览', '/report/overview', 'report:overview'],
        ['财务综合报表', '/report/finance', 'report:finance'],
        ['消费综合报表', '/report/consume', 'report:consume'],
        ['考勤综合报表', '/report/attendance', 'report:attendance'],
        ['门禁综合报表', '/report/access', 'report:access'],
        ['订餐综合报表', '/report/meal', 'report:meal'],
      ],
    },
    {
      key: 'tool',
      title: '报表工具',
      leaves: [
        ['报表模板', '/report/template', 'report:template'],
        ['常用报表', '/report/favorite', 'report:favorite'],
        ['导出任务', '/report/export-task', 'report:exportTask'],
      ],
    },
  ],
})
