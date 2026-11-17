// 卡务中心导航（5 个分组、29 个页面）
import { IdcardOutlined } from '@ant-design/icons'
import { defineDomain } from './builder'

export const cardDomain = defineDomain({
  key: 'card',
  label: '卡务中心',
  icon: <IdcardOutlined />,
  permission: 'card:view',
  description: '人员与组织档案、账户与卡、资金业务、结算报表与日志维护',
  groups: [
    {
      key: 'person-org',
      title: '人员与组织',
      leaves: [
        ['人员档案', '/card/person', 'card:person:view'],
        ['部门档案', '/card/dept', 'card:dept:view'],
        ['编码管理', '/card/code', 'card:code:view'],
        ['人脸照片库', '/card/face', 'card:face:view'],
        ['人员导入导出', '/card/import', 'card:import:view'],
      ],
    },
    {
      key: 'account',
      title: '账户与卡',
      leaves: [
        ['账户信息设置', '/card/account', 'card:account:view'],
        ['账户类别设置', '/card/account-type', 'card:accountType:view'],
        ['开户与销户', '/card/account-open', 'card:accountOpen:view'],
        ['账户冻结与解冻', '/card/freeze', 'card:freeze:view'],
        ['换卡与补卡', '/card/card-change', 'card:cardChange:view'],
        ['卡挂失与解挂', '/card/card-loss', 'card:cardLoss:view'],
        ['导入授权 ID 卡', '/card/card-import', 'card:cardImport:view'],
        ['个人账户', '/card/personal', 'card:personal:view'],
      ],
    },
    {
      key: 'fund',
      title: '资金业务',
      leaves: [
        ['充值存款', '/card/recharge', 'card:recharge:view'],
        ['用户取款', '/card/withdraw', 'card:withdraw:view'],
        ['小金额转账', '/card/transfer', 'card:transfer:view'],
        ['补贴发放', '/card/subsidy', 'card:subsidy:view'],
        ['出纳授权', '/card/cashier-auth', 'card:cashierAuth:view'],
        ['支付订单与日志', '/card/pay-order', 'card:payOrder:view'],
      ],
    },
    {
      key: 'report',
      title: '结算与报表',
      leaves: [
        ['会计出纳报表', '/card/report/cashier', 'card:report:cashier'],
        ['账户余额表', '/card/report/balance', 'card:report:balance'],
        ['卡状态统计表', '/card/report/card-state', 'card:report:cardState'],
        ['资金明细报表', '/card/report/fund-detail', 'card:report:fundDetail'],
        ['人员花名册', '/card/report/roster', 'card:report:roster'],
      ],
    },
    {
      key: 'log',
      title: '日志与维护',
      leaves: [
        ['系统日志管理', '/card/log', 'card:log:view'],
        ['数据备份', '/card/backup', 'card:backup:view'],
        ['数据清理', '/card/clean', 'card:clean:view'],
        ['黑名单管理', '/card/blacklist', 'card:blacklist:view'],
        ['财务结算', '/card/settlement', 'card:settlement:view'],
      ],
    },
  ],
})
