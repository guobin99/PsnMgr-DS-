import type { ReactNode } from 'react'

/** 三段式权限码：业务域:资源:操作 */
export type PermissionCode = string

/** 导航节点：业务域 → 子功能分组 → 操作页面 三级树 */
export interface NavNode {
  /** 全树唯一键；分组键为「域键-分组英文-group」，叶子键由路径派生 */
  key: string
  /** 菜单名称，同时用作面包屑与页签标题 */
  label: string
  /** 路由路径，仅叶子节点有值 */
  path?: string
  /** 一级业务域图标 */
  icon?: ReactNode
  /** 叶子为页面级权限码，业务域为域级查看权限 */
  permission?: PermissionCode
  /** 功能说明，用于占位页描述 */
  description?: string
  children?: NavNode[]
}

/** 面包屑条目；分组节点无 path，不可点击 */
export interface CrumbItem {
  key: string
  label: string
  path?: string
}

/** 顶栏业务域入口 */
export interface DomainMeta {
  key: string
  label: string
  icon?: ReactNode
  permission: PermissionCode
  description: string
  entryPath: string
  leafCount: number
}

/** 业务占位页元信息 */
export interface ModulePageMeta {
  path: string
  title: string
  domainKey: string
  domainLabel: string
  groupLabel: string
  description: string
  primaryAction: string
  /** 页面级权限码，如 card:person:view */
  permission?: PermissionCode
  /** 资源段，如 card:person，用于派生 :edit / :export */
  resource: string
  /** 是否需要真实主数据（决定占位页表格列口径） */
  kind: 'report' | 'record' | 'master' | 'setting'
}

/** 多页签条目；激活态由当前路径推导，不落库 */
export interface TabItem {
  key: string
  path: string
  title: string
  domain: string
  closable: boolean
}

/** 会话用户：权限码集合是前端判定的唯一依据 */
export interface SessionUser {
  /** 用户主键；演示态为 U+账号大写，正式态取 CS 操作员编号 */
  userId: string
  userName: string
  displayName: string
  roleNo: string
  roleName: string
  deptName: string
  permissions: PermissionCode[]
}

export interface LoginPayload {
  userName: string
  password: string
}

export interface LoginResult {
  token: string
  user: SessionUser
  /** 临时密码/密码被重置后首次登录，前端需先强制改密 */
  mustChangePassword?: boolean
}

/** 全局菜单搜索索引项 */
export interface MenuSearchItem {
  path: string
  title: string
  domain: string
  /** 业务域 / 分组 / 页面 */
  trail: string
  depth: number
}

/** 统一返回体 */
export interface ApiResult<T> {
  code: number | string
  message?: string
  data: T
}
