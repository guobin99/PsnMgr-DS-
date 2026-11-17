import type { SessionUser } from '@/types/navigation'

/** 演示密码：仅存在于开发环境代码中，登录请求后即丢弃，不写入本地存储 */
export const DEMO_PASSWORD = '123456'

export interface RoleDefinition {
  roleNo: string
  roleName: string
  deptName: string
  /** 权限码集合，支持 * 与「域:*」两种通配 */
  permissions: string[]
  summary: string
}

/**
 * 开发环境内置的六个演示角色。正式部署由后端按 CS 的
 * ST_UserInfo / ST_RoleRight / ST_RightInfo 映射为权限码集合下发，前端不做硬编码。
 */
export const DEMO_ROLES: RoleDefinition[] = [
  {
    roleNo: 'R_ADMIN',
    roleName: '系统管理员',
    deptName: '信息中心',
    permissions: ['*'],
    summary: '全部九个业务域与工作台，全部操作',
  },
  {
    roleNo: 'R_CASHIER',
    roleName: '卡务出纳',
    deptName: '财务处',
    permissions: [
      'dashboard:view',
      'card:*',
      'consume:record:*',
      'consume:report:*',
      'consume:summary:*',
      'report:*',
      'system:log:*',
    ],
    summary: '工作台、卡务中心、消费流水与明细汇总报表、报表中心、四类日志',
  },
  {
    roleNo: 'R_HR',
    roleName: '人事考勤',
    deptName: '人力资源部',
    permissions: [
      'dashboard:view',
      'attendance:*',
      'card:person:view',
      'card:dept:view',
      'card:face:view',
      'card:report:roster',
      'visitor:*',
      'report:overview',
      'report:attendance',
    ],
    summary: '工作台、考勤管理、人员与部门档案、人脸照片库、花名册、访客、运营与考勤报表',
  },
  {
    roleNo: 'R_SECURITY',
    roleName: '门禁安保',
    deptName: '保卫处',
    permissions: [
      'dashboard:view',
      'access:*',
      'visitor:*',
      'card:person:view',
      'card:face:view',
      'report:overview',
      'report:access',
    ],
    summary: '工作台、门禁管理、访客管理、人员档案与人脸照片库、运营与门禁报表',
  },
  {
    roleNo: 'R_CANTEEN',
    roleName: '食堂消费',
    deptName: '后勤服务集团',
    permissions: [
      'dashboard:view',
      'consume:*',
      'meal:*',
      'card:person:view',
      'report:overview',
      'report:consume',
      'report:meal',
    ],
    summary: '工作台、消费管理、订餐管理、人员档案、运营与消费订餐报表',
  },
  {
    roleNo: 'R_VIEWER',
    roleName: '运营查看',
    deptName: '校务办公室',
    permissions: ['dashboard:view', 'report:*'],
    summary: '工作台与报表中心全部页面，其余业务域不显示',
  },
]

export interface DemoAccount {
  userName: string
  displayName: string
  roleNo: string
  roleName: string
  deptName: string
}

/** 演示账号：点击登录页标签即填入账号与演示密码 */
export const DEMO_ACCOUNTS: DemoAccount[] = [
  { userName: 'admin', displayName: '系统管理员', roleNo: 'R_ADMIN', roleName: '系统管理员', deptName: '信息中心' },
  { userName: 'cashier', displayName: '出纳 · 张明', roleNo: 'R_CASHIER', roleName: '卡务出纳', deptName: '财务处' },
  { userName: 'hr', displayName: '考勤 · 李慧', roleNo: 'R_HR', roleName: '人事考勤', deptName: '人力资源部' },
  { userName: 'security', displayName: '安保 · 王强', roleNo: 'R_SECURITY', roleName: '门禁安保', deptName: '保卫处' },
  { userName: 'canteen', displayName: '食堂 · 赵磊', roleNo: 'R_CANTEEN', roleName: '食堂消费', deptName: '后勤服务集团' },
  { userName: 'viewer', displayName: '运营 · 陈婷', roleNo: 'R_VIEWER', roleName: '运营查看', deptName: '校务办公室' },
]

export function findDemoAccount(userName: string): DemoAccount | undefined {
  const value = userName.trim().toLowerCase()
  return DEMO_ACCOUNTS.find((account) => account.userName.toLowerCase() === value)
}

export function findRole(roleNo: string): RoleDefinition | undefined {
  return DEMO_ROLES.find((role) => role.roleNo === roleNo)
}

/** 按演示账号构造会话用户；用户主键为 U + 账号大写 */
export function buildDemoUser(account: DemoAccount): SessionUser {
  const role = findRole(account.roleNo)
  return {
    userId: `U${account.userName.toUpperCase()}`,
    userName: account.userName,
    displayName: account.displayName,
    roleNo: account.roleNo,
    roleName: account.roleName,
    deptName: account.deptName,
    permissions: role ? [...role.permissions] : ['dashboard:view'],
  }
}

/** 后端下发用户缺少权限码时，按同名演示账号补全（仅开发环境） */
export function resolveDemoPermissions(userName: string): string[] {
  const account = findDemoAccount(userName)
  if (!account) return []
  return findRole(account.roleNo)?.permissions ?? []
}
