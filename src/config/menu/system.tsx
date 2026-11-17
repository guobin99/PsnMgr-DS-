// 系统管理导航（3 个分组、16 个页面）
import { SettingOutlined } from '@ant-design/icons'
import { defineDomain } from './builder'

export const systemDomain = defineDomain({
  key: 'system',
  label: '系统管理',
  icon: <SettingOutlined />,
  permission: 'system:view',
  description: '操作员角色与权限、系统参数字典、安全审计日志',
  groups: [
    {
      key: 'org',
      title: '组织与权限',
      leaves: [
        ['操作员管理', '/system/operator', 'system:operator:view'],
        ['角色管理', '/system/role', 'system:role:view'],
        ['菜单与操作权限', '/system/permission', 'system:permission:view'],
        ['部门数据权限', '/system/dept-right', 'system:deptRight:view'],
        ['设备权限', '/system/device-right', 'system:deviceRight:view'],
        ['子系统权限', '/system/subsystem-right', 'system:subsystemRight:view'],
        ['出纳授权管理', '/system/cashier-auth', 'system:cashierAuth:view'],
      ],
    },
    {
      key: 'config',
      title: '系统配置',
      leaves: [
        ['系统参数', '/system/param', 'system:param:view'],
        ['数据字典', '/system/dict', 'system:dict:view'],
        ['接口与集成', '/system/integration', 'system:integration:view'],
        ['数据维护', '/system/maintain', 'system:maintain:view'],
        ['黑名单管理', '/system/blacklist', 'system:blacklist:view'],
      ],
    },
    {
      key: 'audit',
      title: '安全审计',
      leaves: [
        ['系统日志', '/system/log/system', 'system:log:system'],
        ['登录日志', '/system/log/login', 'system:log:login'],
        ['操作审计', '/system/log/oper', 'system:log:oper'],
        ['同步日志', '/system/log/sync', 'system:log:sync'],
      ],
    },
  ],
})
