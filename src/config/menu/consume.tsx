// 消费管理导航（4 个分组、26 个页面）
import { ShoppingCartOutlined } from '@ant-design/icons'
import { defineDomain } from './builder'

export const consumeDomain = defineDomain({
  key: 'consume',
  label: '消费管理',
  icon: <ShoppingCartOutlined />,
  permission: 'consume:view',
  description: '区域食堂、菜谱菜品、终端机参数、消费流水与消费报表',
  groups: [
    {
      key: 'base',
      title: '基础资料',
      leaves: [
        ['区域/食堂设置', '/consume/area', 'consume:area:view'],
        ['餐别设置', '/consume/repast', 'consume:repast:view'],
        ['菜谱设置', '/consume/menu', 'consume:menu:view'],
        ['每日菜品设置', '/consume/daily-dish', 'consume:dailyDish:view'],
        ['菜品与商品档案', '/consume/ware', 'consume:ware:view'],
        ['打折类型设置', '/consume/discount', 'consume:discount:view'],
        ['餐别消费模式设置', '/consume/mode', 'consume:mode:view'],
        ['终端机设置', '/consume/terminal', 'consume:terminal:view'],
        ['键值设置', '/consume/keyvalue', 'consume:keyvalue:view'],
        ['生物识别消费机管理', '/consume/biometric', 'consume:biometric:view'],
      ],
    },
    {
      key: 'biz',
      title: '业务处理',
      leaves: [
        ['消费流水', '/consume/records', 'consume:record:view'],
        ['消费纠错', '/consume/correction', 'consume:correction:view'],
        ['手工补消费', '/consume/manual', 'consume:manual:view'],
        ['U 盘导入消费', '/consume/import', 'consume:import:view'],
        ['异常与冲正', '/consume/reversal', 'consume:reversal:view'],
      ],
    },
    {
      key: 'detail-report',
      title: '明细报表',
      leaves: [
        ['正常消费明细表', '/consume/report/normal', 'consume:report:normal'],
        ['纠错与补消费明细表', '/consume/report/correction', 'consume:report:correction'],
        ['异常消费记录明细表', '/consume/report/abnormal', 'consume:report:abnormal'],
        ['时长消费明细表', '/consume/report/time', 'consume:report:time'],
        ['二维码支付日志', '/consume/report/qrcode-log', 'consume:report:qrcodeLog'],
      ],
    },
    {
      key: 'summary-report',
      title: '汇总报表',
      leaves: [
        ['部门餐别汇总表', '/consume/summary/dept', 'consume:summary:dept'],
        ['人员餐别汇总表', '/consume/summary/person', 'consume:summary:person'],
        ['餐别日报表', '/consume/summary/repast', 'consume:summary:repast'],
        ['机台餐别汇总表', '/consume/summary/moc', 'consume:summary:moc'],
        ['品种消费汇总表', '/consume/summary/ware', 'consume:summary:ware'],
        ['二维码消费汇总', '/consume/summary/qrcode', 'consume:summary:qrcode'],
      ],
    },
  ],
})
