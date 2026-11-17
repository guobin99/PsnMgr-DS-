import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { TabItem } from '@/types/navigation'
import { DASHBOARD_PATH } from '@/config/menu'

export const DASHBOARD_TAB: TabItem = {
  key: 'dashboard',
  path: DASHBOARD_PATH,
  title: '工作台',
  domain: '工作台',
  closable: false,
}

interface TabsContextValue {
  tabs: TabItem[]
  /** 打开或更新页签；同一路径只保留一个 */
  openTab: (tab: Omit<TabItem, 'key'> & { key?: string }) => void
  /** 关闭页签；关闭激活页签时返回回退目标路径，否则返回 null */
  closeTab: (key: string, activePath: string) => string | null
  closeOthers: (key: string) => void
  closeAll: () => string
  reset: () => void
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined)

export function TabsProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useState<TabItem[]>([DASHBOARD_TAB])

  const openTab = useCallback((tab: Omit<TabItem, 'key'> & { key?: string }) => {
    setTabs((previous) => {
      const index = previous.findIndex((item) => item.path === tab.path)
      if (index >= 0) {
        const next = [...previous]
        next[index] = { ...next[index], title: tab.title, domain: tab.domain }
        return next
      }
      return [
        ...previous,
        { key: tab.key ?? tab.path, path: tab.path, title: tab.title, domain: tab.domain, closable: tab.closable },
      ]
    })
  }, [])

  const closeTab = useCallback((key: string, activePath: string) => {
    let fallback: string | null = null
    setTabs((previous) => {
      const index = previous.findIndex((item) => item.key === key)
      if (index < 0 || previous[index].closable === false) return previous
      const closing = previous[index]
      if (closing.path === activePath) {
        const right = previous[index + 1]
        const left = previous[index - 1]
        fallback = right?.path ?? left?.path ?? DASHBOARD_PATH
      }
      return previous.filter((item) => item.key !== key)
    })
    return fallback
  }, [])

  const closeOthers = useCallback((key: string) => {
    setTabs((previous) => previous.filter((item) => item.key === key || !item.closable))
  }, [])

  const closeAll = useCallback(() => {
    setTabs([DASHBOARD_TAB])
    return DASHBOARD_PATH
  }, [])

  const reset = useCallback(() => setTabs([DASHBOARD_TAB]), [])

  const value = useMemo<TabsContextValue>(
    () => ({ tabs, openTab, closeTab, closeOthers, closeAll, reset }),
    [tabs, openTab, closeTab, closeOthers, closeAll, reset],
  )

  return <TabsContext.Provider value={value}>{children}</TabsContext.Provider>
}

export function useTabs(): TabsContextValue {
  const context = useContext(TabsContext)
  if (!context) throw new Error('useTabs 必须在 TabsProvider 内使用')
  return context
}
