import { DashboardOutlined } from '@ant-design/icons'
import type {
  CrumbItem,
  DomainMeta,
  MenuSearchItem,
  ModulePageMeta,
  NavNode,
  PermissionCode,
} from '@/types/navigation'
import { hasPermission } from '@/utils/permission'
import { cardDomain } from './menu/card'
import { consumeDomain } from './menu/consume'
import { attendanceDomain } from './menu/attendance'
import { accessDomain } from './menu/access'
import { mealDomain } from './menu/meal'
import { visitorDomain } from './menu/visitor'
import { utilityDomain } from './menu/utility'
import { reportDomain } from './menu/report'
import { systemDomain } from './menu/system'

/** 工作台路径，同时是页签体系的兜底回退目标 */
export const DASHBOARD_PATH = '/dashboard'

/** 工作台：独立一级节点，所有角色默认可见 */
export const dashboardNode: NavNode = {
  key: 'dashboard',
  label: '工作台',
  path: DASHBOARD_PATH,
  icon: <DashboardOutlined />,
  permission: 'dashboard:view',
  description: '今日经营概览、待办提醒与常用功能入口。',
}

/**
 * 导航树是菜单、路由、面包屑、搜索索引与占位页元信息的唯一数据源。
 * 九个业务域在工作台之下并列，域节点本身不带路径，只负责分组与折叠。
 */
export const navTree: NavNode[] = [
  dashboardNode,
  cardDomain,
  consumeDomain,
  attendanceDomain,
  accessDomain,
  mealDomain,
  visitorDomain,
  utilityDomain,
  reportDomain,
  systemDomain,
]

const leafIndex = new Map<string, NavNode>()
const trailIndex = new Map<string, NavNode[]>()
const parentIndex = new Map<string, string>()

function indexNodes(nodes: NavNode[], trail: NavNode[]): void {
  for (const node of nodes) {
    const nextTrail = [...trail, node]
    if (node.children && node.children.length > 0) {
      indexNodes(node.children, nextTrail)
    } else if (node.path) {
      leafIndex.set(node.path, node)
      trailIndex.set(node.path, nextTrail)
      const parent = nextTrail[nextTrail.length - 2]
      if (parent) parentIndex.set(node.path, parent.key)
    }
  }
}

indexNodes(navTree, [])

/** 深度优先展开整棵树 */
export function flattenMenu(nodes: NavNode[] = navTree): NavNode[] {
  const result: NavNode[] = []
  const visit = (list: NavNode[]): void => {
    for (const node of list) {
      result.push(node)
      if (node.children) visit(node.children)
    }
  }
  visit(nodes)
  return result
}

/** 只展开无子节点的叶子 */
export function flattenLeaves(nodes: NavNode[] = navTree): NavNode[] {
  return flattenMenu(nodes).filter((node) => !!node.path)
}

/** 按路径精确查找叶子节点 */
export function findNodeByPath(path: string): NavNode | undefined {
  return leafIndex.get(path)
}

/** 从业务域到当前叶子的完整链路 */
export function getMenuTrail(path: string): NavNode[] {
  return trailIndex.get(path) ?? []
}

/** 当前路径所属业务域 */
export function getDomainOf(path: string): NavNode | undefined {
  return getMenuTrail(path)[0]
}

/** 当前路径的直接父级键（菜单展开态用） */
export function getParentKeyOf(path: string): string | undefined {
  return parentIndex.get(path)
}

/** 链路转面包屑；首页固定首项并链接工作台，末项不可点击 */
export function getBreadcrumbs(path: string): CrumbItem[] {
  const trail = getMenuTrail(path)
  if (trail.length === 0) return [{ key: 'home', label: '首页', path: DASHBOARD_PATH }]
  return [
    { key: 'home', label: '首页', path: DASHBOARD_PATH },
    ...trail.map((node) => ({ key: node.key, label: node.label, path: node.path })),
  ]
}

/** 链路去掉末节点，得到需要展开的父级键 */
export function getOpenKeys(path: string): string[] {
  return getMenuTrail(path)
    .slice(0, -1)
    .map((node) => node.key)
}

/**
 * 菜单级权限过滤：叶子未命中权限即移除，分组与业务域在子节点全空时不渲染。
 * 侧边栏、顶栏业务域下拉与搜索索引共用这一份结果。
 */
export function filterMenuByPermission(
  nodes: NavNode[],
  permissions: PermissionCode[],
): NavNode[] {
  const result: NavNode[] = []
  for (const node of nodes) {
    if (node.children && node.children.length > 0) {
      const children = filterMenuByPermission(node.children, permissions)
      if (children.length > 0) result.push({ ...node, children })
    } else if (hasPermission(permissions, node.permission)) {
      result.push(node)
    }
  }
  return result
}

/** 顶栏业务域入口：取每个域第一个可见叶子的路径作为入口 */
export function buildDomainEntries(visibleTree: NavNode[]): DomainMeta[] {
  return visibleTree
    .filter((node) => node.key !== dashboardNode.key)
    .map((node) => {
      const leaves = flattenLeaves([node])
      return {
        key: node.key,
        label: node.label,
        icon: node.icon,
        permission: node.permission ?? `${node.key}:view`,
        description: node.description ?? '',
        entryPath: leaves[0]?.path ?? DASHBOARD_PATH,
        leafCount: leaves.length,
      }
    })
    .filter((entry) => entry.entryPath !== DASHBOARD_PATH)
}

const REPORT_WORDS = ['报表', '明细', '汇总', '统计', '总览', '台账']
/** 命中这些词的页面不产生新增动作，主操作统一为导出（对应文档 5.5 的派生规则） */
const EXPORT_WORDS = ['报表', '明细', '汇总', '统计', '总览', '台账', '记录', '日志', '流水', '查询']
const RECORD_WORDS = ['记录', '日志', '流水', '查询', '数据', '审计']
const SETTING_WORDS = ['设置', '参数', '规则', '配置', '维护', '清理', '备份', '授权', '定义']

function resolveKind(label: string): ModulePageMeta['kind'] {
  if (REPORT_WORDS.some((word) => label.includes(word))) return 'report'
  if (RECORD_WORDS.some((word) => label.includes(word))) return 'record'
  if (SETTING_WORDS.some((word) => label.includes(word))) return 'setting'
  return 'master'
}

/** 由导航节点派生业务占位页元信息，187 条路由共用同一模板 */
export function getModulePageMeta(path: string): ModulePageMeta | undefined {
  const node = findNodeByPath(path)
  if (!node) return undefined
  const trail = getMenuTrail(path)
  const domain = trail[0]
  const group = trail[1]
  const kind = resolveKind(node.label)
  const permission = node.permission ?? ''
  return {
    path,
    title: node.label,
    domainKey: domain?.key ?? '',
    domainLabel: domain?.label ?? '',
    groupLabel: group?.label ?? '',
    description: node.description ?? `${node.label}的查询、核对与维护`,
    primaryAction: EXPORT_WORDS.some((word) => node.label.includes(word))
      ? '导出数据'
      : `新增${node.label}`,
    permission,
    resource: permission.replace(/:view$/, ''),
    kind,
  }
}

/** 全局搜索索引：路径、名称、业务域、层级链路 */
export function buildMenuSearchIndex(visibleTree: NavNode[]): MenuSearchItem[] {
  const items: MenuSearchItem[] = []
  const visit = (nodes: NavNode[], labels: string[], domainLabel: string): void => {
    for (const node of nodes) {
      const nextLabels = [...labels, node.label]
      if (node.children && node.children.length > 0) {
        visit(node.children, nextLabels, labels.length === 0 ? node.label : domainLabel)
      } else if (node.path) {
        items.push({
          path: node.path,
          title: node.label,
          domain: domainLabel || nextLabels[0],
          trail: nextLabels.join(' / '),
          depth: nextLabels.length,
        })
      }
    }
  }
  visit(visibleTree, [], '')
  return items
}

/** 搜索：名称与链路忽略大小写包含匹配，按层级数升序取前 limit 条 */
export function searchMenu(index: MenuSearchItem[], keyword: string, limit = 8): MenuSearchItem[] {
  const value = keyword.trim().toLowerCase()
  if (!value) return []
  return index
    .filter(
      (item) =>
        item.title.toLowerCase().includes(value) ||
        item.trail.toLowerCase().includes(value) ||
        item.path.toLowerCase().includes(value),
    )
    .sort((a, b) => a.depth - b.depth || a.trail.length - b.trail.length)
    .slice(0, limit)
}

/** 业务域根路径重定向：/card → /card/person（取过滤后第一个叶子） */
export function resolveDomainEntry(domainKey: string, visibleTree: NavNode[]): string {
  const domain = visibleTree.find((node) => node.key === domainKey)
  if (!domain) return DASHBOARD_PATH
  const leaves = flattenLeaves([domain])
  return leaves[0]?.path ?? DASHBOARD_PATH
}
