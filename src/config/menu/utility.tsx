// 水控/巡更导航（2 个分组、15 个页面）
import { ThunderboltOutlined } from '@ant-design/icons'
import { defineDomain } from './builder'

export const utilityDomain = defineDomain({
  key: 'utility',
  label: '水控/巡更',
  icon: <ThunderboltOutlined />,
  permission: 'utility:view',
  description: '水控卡类终端与采集汇总、巡更点位线路计划与记录',
  groups: [
    {
      key: 'water',
      title: '水控管理',
      leaves: [
        ['卡类设置', '/utility/water/card-type', 'utility:water:cardType'],
        ['终端机设置', '/utility/water/terminal', 'utility:water:terminal'],
        ['消费场合设置', '/utility/water/area', 'utility:water:area'],
        ['水控补贴机', '/utility/water/subsidy', 'utility:water:subsidy'],
        ['特殊卡管理', '/utility/water/special-card', 'utility:water:specialCard'],
        ['打折时段设置', '/utility/water/discount', 'utility:water:discount'],
        ['区域/场所设置', '/utility/water/site', 'utility:water:site'],
        ['采集记录', '/utility/water/record', 'utility:water:record'],
        ['采集数据汇总表', '/utility/water/report', 'utility:water:report'],
      ],
    },
    {
      key: 'patrol',
      title: '巡更管理',
      leaves: [
        ['巡更点设置', '/utility/patrol/site', 'utility:patrol:site'],
        ['巡更线路设置', '/utility/patrol/route', 'utility:patrol:route'],
        ['巡更人员与计划', '/utility/patrol/plan', 'utility:patrol:plan'],
        ['巡更记录', '/utility/patrol/record', 'utility:patrol:record'],
        ['巡更日报', '/utility/patrol/daily', 'utility:patrol:daily'],
        ['巡更异常事件', '/utility/patrol/event', 'utility:patrol:event'],
      ],
    },
  ],
})
