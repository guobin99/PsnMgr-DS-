import { useMemo } from 'react'
import { Menu, type MenuProps } from 'antd'
import type { NavNode } from '@/types/navigation'
import { flattenMenu } from '@/config/menu'

type MenuItem = Required<MenuProps>['items'][number]

function toMenuItems(nodes: NavNode[]): MenuItem[] {
  return nodes.map((node) => {
    if (node.children && node.children.length > 0) {
      return {
        key: node.key,
        icon: node.icon,
        label: node.label,
        children: toMenuItems(node.children),
      }
    }
    return { key: node.key, icon: node.icon, label: node.label }
  })
}

/** 关键词过滤：仅保留命中的叶子及其父级；空关键词返回原树 */
function filterByKeyword(nodes: NavNode[], keyword: string): NavNode[] {
  const value = keyword.trim().toLowerCase()
  if (!value) return nodes
  const result: NavNode[] = []
  for (const node of nodes) {
    if (node.children && node.children.length > 0) {
      // 业务域或分组名称命中时，保留其全部子节点，便于按域检索
      const children = node.label.toLowerCase().includes(value)
        ? node.children
        : filterByKeyword(node.children, value)
      if (children.length > 0) result.push({ ...node, children })
    } else {
      const hit =
        node.label.toLowerCase().includes(value) ||
        (node.path ?? '').toLowerCase().includes(value)
      if (hit) result.push(node)
    }
  }
  return result
}

interface SideMenuProps {
  tree: NavNode[]
  collapsed: boolean
  selectedKey?: string
  openKeys: string[]
  keyword: string
  onOpenChange: (keys: string[]) => void
  onSelectPath: (path: string) => void
}

/** 深色 inline 菜单：选中键由路径反查得到，分组标题只控制展开 */
export function SideMenu({
  tree,
  collapsed,
  selectedKey,
  openKeys,
  keyword,
  onOpenChange,
  onSelectPath,
}: SideMenuProps) {
  const filtered = useMemo(() => filterByKeyword(tree, keyword), [tree, keyword])
  const items = useMemo(() => toMenuItems(filtered), [filtered])
  // 关键词非空时自动展开所有命中的父级，避免命中结果藏在折叠的分组内
  const effectiveOpenKeys = useMemo(() => {
    if (!keyword.trim()) return openKeys
    const keys: string[] = []
    const visit = (nodes: NavNode[]): void => {
      for (const node of nodes) {
        if (node.children && node.children.length > 0) {
          keys.push(node.key)
          visit(node.children)
        }
      }
    }
    visit(filtered)
    return keys
  }, [filtered, keyword, openKeys])

  const nodeByKey = useMemo(() => {
    const map = new Map<string, NavNode>()
    for (const node of flattenMenu(tree)) map.set(node.key, node)
    return map
  }, [tree])

  return (
    <>
      {items.length === 0 ? (
        <div className="app-sider__empty">
          没有匹配「{keyword}」的菜单。
          <br />
          可尝试页面名称或路径关键词。
        </div>
      ) : (
        <Menu
          mode="inline"
          theme="dark"
          items={items}
          selectedKeys={selectedKey ? [selectedKey] : []}
          openKeys={collapsed ? [] : effectiveOpenKeys}
          onOpenChange={(keys) => onOpenChange(keys as string[])}
          onClick={({ key }) => {
            const node = nodeByKey.get(key)
            if (node?.path) onSelectPath(node.path)
          }}
        />
      )}
    </>
  )
}
