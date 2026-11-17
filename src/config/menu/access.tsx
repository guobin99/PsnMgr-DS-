// 门禁管理导航（7 个分组、37 个页面）
import { SafetyCertificateOutlined } from '@ant-design/icons'
import { defineDomain } from './builder'

export const accessDomain = defineDomain({
  key: 'access',
  label: '门禁管理',
  icon: <SafetyCertificateOutlined />,
  permission: 'access:view',
  description: '控制器与时段、权限下发、联动控制、远程监控与通行记录',
  groups: [
    {
      key: 'device',
      title: '设备与时段',
      leaves: [
        ['控制器设置', '/access/controller', 'access:controller:view'],
        ['门属性设置', '/access/door', 'access:door:view'],
        ['门开关时段设置', '/access/door-time', 'access:doorTime:view'],
        ['门特殊时段设置', '/access/door-special', 'access:doorSpecial:view'],
        ['人进出时段设置', '/access/psn-time', 'access:psnTime:view'],
        ['人特殊时段设置', '/access/psn-special', 'access:psnSpecial:view'],
        ['进出权限方案管理', '/access/scheme', 'access:scheme:view'],
        ['扩展点设置', '/access/extension-point', 'access:extensionPoint:view'],
      ],
    },
    {
      key: 'grant',
      title: '授权与下发',
      leaves: [
        ['人员设置', '/access/person', 'access:person:view'],
        ['门权限设置', '/access/permission', 'access:permission:view'],
        ['超级卡或密码', '/access/super-card', 'access:superCard:view'],
        ['刷卡添加用户', '/access/card-add', 'access:cardAdd:view'],
        ['管理卡设置', '/access/manage-card', 'access:manageCard:view'],
      ],
    },
    {
      key: 'linkage',
      title: '联动与控制',
      leaves: [
        ['控制器联动设置', '/access/linkage', 'access:linkage:view'],
        ['报警输出设置', '/access/alarm-out', 'access:alarmOut:view'],
        ['多门互锁设置', '/access/interlock', 'access:interlock:view'],
        ['紧急群组设置', '/access/emergency', 'access:emergency:view'],
        ['首卡开门设置', '/access/first-card', 'access:firstCard:view'],
        ['多卡开门设置', '/access/multi-card', 'access:multiCard:view'],
        ['会议管理', '/access/meeting', 'access:meeting:view'],
        ['DVS 联动', '/access/dvs', 'access:dvs:view'],
      ],
    },
    {
      key: 'monitor',
      title: '远程监控',
      leaves: [
        ['门禁控制台', '/access/console', 'access:console:view'],
        ['电子地图设计', '/access/map-design', 'access:map:design'],
        ['地图实时监控', '/access/map-monitor', 'access:map:monitor'],
        ['人脸识别终端', '/access/face-terminal', 'access:faceTerminal:view'],
      ],
    },
    {
      key: 'record',
      title: '记录查询',
      leaves: [
        ['正常通行记录', '/access/record/normal', 'access:record:normal'],
        ['异常通行记录', '/access/record/abnormal', 'access:record:abnormal'],
        ['报警事件记录', '/access/record/alarm', 'access:record:alarm'],
        ['实时监控记录', '/access/record/realtime', 'access:record:realtime'],
      ],
    },
    {
      key: 'finger',
      title: '指纹门禁',
      leaves: [
        ['时段设置', '/access/finger/time', 'access:finger:time'],
        ['时段组别设置', '/access/finger/group', 'access:finger:group'],
        ['开锁组合设置', '/access/finger/combo', 'access:finger:combo'],
        ['人员时段设置', '/access/finger/person', 'access:finger:person'],
        ['生物识别门禁机管理', '/access/finger/terminal', 'access:finger:terminal'],
      ],
    },
    {
      key: 'maintain',
      title: '系统维护',
      leaves: [
        ['门禁系统参数', '/access/param', 'access:param:view'],
        ['扩展功能设置', '/access/extension', 'access:extension:view'],
        ['清理过期数据', '/access/clean', 'access:clean:view'],
      ],
    },
  ],
})
