// 访客管理导航（4 个分组、10 个页面）
import { TeamOutlined } from '@ant-design/icons'
import { defineDomain } from './builder'

export const visitorDomain = defineDomain({
  key: 'visitor',
  label: '访客管理',
  icon: <TeamOutlined />,
  permission: 'visitor:view',
  description: '访客预约审批、访客卡与签到签离、来访记录与参数',
  groups: [
    {
      key: 'apply',
      title: '预约与审批',
      leaves: [
        ['访客预约登记', '/visitor/apply', 'visitor:apply:view'],
        ['预约审核', '/visitor/approve', 'visitor:approve:view'],
        ['访客预约记录', '/visitor/apply-record', 'visitor:applyRecord:view'],
      ],
    },
    {
      key: 'biz',
      title: '访客业务',
      leaves: [
        ['访客卡登记', '/visitor/card', 'visitor:card:view'],
        ['访客签到签离', '/visitor/checkin', 'visitor:checkin:view'],
        ['访客通行登记', '/visitor/access', 'visitor:access:view'],
      ],
    },
    {
      key: 'record',
      title: '记录与报表',
      leaves: [
        ['访客签到记录', '/visitor/checkin-record', 'visitor:record:checkin'],
        ['访客进出记录', '/visitor/access-record', 'visitor:record:access'],
        ['访客报表', '/visitor/report', 'visitor:record:report'],
      ],
    },
    {
      key: 'param',
      title: '参数设置',
      leaves: [
        ['访客参数设置', '/visitor/param', 'visitor:param:view'],
      ],
    },
  ],
})
