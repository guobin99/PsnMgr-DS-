import type { ReactNode } from 'react'
import type { NavNode } from '@/types/navigation'

/** 叶子定义：[页面名称, 路由路径, 页面级权限码] */
export type LeafTuple = [label: string, path: string, permission: string]

export interface GroupInput {
  /** 分组英文键（不含域前缀），最终键为「域键-分组键-group」 */
  key: string
  title: string
  leaves: LeafTuple[]
}

export interface DomainInput {
  key: string
  label: string
  icon: ReactNode
  permission: string
  description: string
  groups: GroupInput[]
}

/** 由路径派生叶子键：/card/card-change → card-card-change，与文档 4.1 节一致 */
export function pathToKey(path: string): string {
  return path.replace(/^\//, '').replace(/\//g, '-')
}

/**
 * 把「域 + 分组 + 叶子元组」的紧凑声明展开为 NavNode 树。
 * 声明只写页面名称、路径与权限码三件事，其余字段（键、描述）统一派生，
 * 避免 187 个页面手工重复书写键名导致的重复键与选中态错乱。
 */
export function defineDomain(input: DomainInput): NavNode {
  const domainLabel = input.label
  return {
    key: input.key,
    label: domainLabel,
    icon: input.icon,
    permission: input.permission,
    description: input.description,
    children: input.groups.map((group) => ({
      key: `${input.key}-group-${group.key}`,
      label: group.title,
      children: group.leaves.map(([label, path, permission]) => ({
        key: pathToKey(path),
        label,
        path,
        permission,
        description: `${group.title} · ${label}：承载${label}的台账查询、明细核对与维护操作。`,
      })),
    })),
  }
}
