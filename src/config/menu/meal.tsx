// 订餐管理导航（4 个分组、19 个页面）
import { CoffeeOutlined } from '@ant-design/icons'
import { defineDomain } from './builder'

export const mealDomain = defineDomain({
  key: 'meal',
  label: '订餐管理',
  icon: <CoffeeOutlined />,
  permission: 'meal:view',
  description: '订餐参数规则、订餐机、订餐订单核销与订餐报表',
  groups: [
    {
      key: 'base',
      title: '基础设置',
      leaves: [
        ['系统参数设置', '/meal/param', 'meal:param:view'],
        ['订餐机设置', '/meal/terminal', 'meal:terminal:view'],
        ['订餐规则设置', '/meal/rule', 'meal:rule:view'],
        ['订餐时间设置', '/meal/time', 'meal:time:view'],
        ['食堂与区域', '/meal/area', 'meal:area:view'],
        ['菜品与类别', '/meal/ware', 'meal:ware:view'],
        ['每日菜品', '/meal/daily-dish', 'meal:dailyDish:view'],
        ['餐别设置', '/meal/repast', 'meal:repast:view'],
      ],
    },
    {
      key: 'biz',
      title: '订餐业务',
      leaves: [
        ['订餐数据下载', '/meal/download', 'meal:download:view'],
        ['订餐机控制台', '/meal/console', 'meal:console:view'],
        ['手工订餐', '/meal/manual', 'meal:manual:view'],
        ['撤销订餐', '/meal/cancel', 'meal:cancel:view'],
        ['订餐订单', '/meal/order', 'meal:order:view'],
        ['取餐核销', '/meal/verify', 'meal:verify:view'],
      ],
    },
    {
      key: 'report',
      title: '订餐报表',
      leaves: [
        ['订餐数据明细', '/meal/report/detail', 'meal:report:detail'],
        ['订餐数据汇总', '/meal/report/summary', 'meal:report:summary'],
        ['未用餐明细', '/meal/report/unused', 'meal:report:unused'],
        ['未用餐汇总', '/meal/report/unused-summary', 'meal:report:unusedSummary'],
      ],
    },
    {
      key: 'maintain',
      title: '系统维护',
      leaves: [
        ['过期数据清理', '/meal/clean', 'meal:clean:view'],
      ],
    },
  ],
})
