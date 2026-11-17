// 考勤管理导航（5 个分组、26 个页面）
import { ScheduleOutlined } from '@ant-design/icons'
import { defineDomain } from './builder'

export const attendanceDomain = defineDomain({
  key: 'attendance',
  label: '考勤管理',
  icon: <ScheduleOutlined />,
  permission: 'attendance:view',
  description: '账套规则、班次排班、考勤数据、异常处理与考勤报表',
  groups: [
    {
      key: 'base',
      title: '基础设置',
      leaves: [
        ['账套管理', '/attendance/account', 'attendance:account:view'],
        ['考勤规则', '/attendance/rule', 'attendance:rule:view'],
        ['假种定义', '/attendance/leave-type', 'attendance:leaveType:view'],
        ['法定假定义', '/attendance/holiday', 'attendance:holiday:view'],
        ['考勤机设置', '/attendance/terminal', 'attendance:terminal:view'],
        ['人员考勤信息', '/attendance/person', 'attendance:person:view'],
        ['班次设置', '/attendance/shift', 'attendance:shift:view'],
        ['安排班次', '/attendance/schedule', 'attendance:schedule:view'],
      ],
    },
    {
      key: 'data',
      title: '考勤数据',
      leaves: [
        ['考勤数据下载', '/attendance/download', 'attendance:download:view'],
        ['原始刷卡数据', '/attendance/raw', 'attendance:raw:view'],
        ['外进外出数据', '/attendance/out', 'attendance:out:view'],
        ['每日考勤', '/attendance/daily', 'attendance:daily:view'],
        ['历史考勤', '/attendance/history', 'attendance:history:view'],
        ['生物识别考勤机管理', '/attendance/biometric', 'attendance:biometric:view'],
      ],
    },
    {
      key: 'exception',
      title: '异常处理',
      leaves: [
        ['请假登记', '/attendance/leave', 'attendance:leave:view'],
        ['班次调整', '/attendance/adjust', 'attendance:adjust:view'],
        ['调休补班', '/attendance/makeup', 'attendance:makeup:view'],
        ['加班登记', '/attendance/overtime', 'attendance:overtime:view'],
        ['增补刷卡', '/attendance/makeup-card', 'attendance:makeupCard:view'],
        ['补出勤补加班', '/attendance/supplement', 'attendance:supplement:view'],
      ],
    },
    {
      key: 'photo',
      title: '拍照考勤机',
      leaves: [
        ['照片对比', '/attendance/photo-compare', 'attendance:photo:compare'],
        ['实时显示', '/attendance/photo-realtime', 'attendance:photo:realtime'],
        ['配置参数', '/attendance/photo-config', 'attendance:photo:config'],
      ],
    },
    {
      key: 'report',
      title: '统计报表',
      leaves: [
        ['考勤日报表', '/attendance/report/daily', 'attendance:report:daily'],
        ['考勤月报表', '/attendance/report/month', 'attendance:report:month'],
        ['考勤年报表', '/attendance/report/year', 'attendance:report:year'],
      ],
    },
  ],
})
