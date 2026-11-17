import { useEffect, useMemo, useRef, useState } from 'react'
import { Empty, Input } from 'antd'
import { FileSearchOutlined, SearchOutlined } from '@ant-design/icons'
import type { MenuSearchItem } from '@/types/navigation'
import { searchMenu } from '@/config/menu'

interface GlobalSearchProps {
  index: MenuSearchItem[]
  onSelect: (path: string) => void
}

/** 全局菜单搜索：名称与层级链路包含匹配，失焦延时 180ms 再收起候选 */
export function GlobalSearch({ index, onSelect }: GlobalSearchProps) {
  const [keyword, setKeyword] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const timer = useRef<number | null>(null)

  const candidates = useMemo(() => searchMenu(index, keyword), [index, keyword])

  useEffect(() => {
    setActiveIndex(0)
  }, [keyword])

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [])

  const commit = (item: MenuSearchItem) => {
    onSelect(item.path)
    setKeyword('')
    setOpen(false)
  }

  return (
    <div className="app-search">
      <Input
        allowClear
        value={keyword}
        prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
        placeholder="搜索菜单或页面"
        onChange={(event) => {
          setKeyword(event.target.value)
          setOpen(true)
        }}
        onFocus={() => {
          if (timer.current) window.clearTimeout(timer.current)
          if (keyword) setOpen(true)
        }}
        onBlur={() => {
          timer.current = window.setTimeout(() => setOpen(false), 180)
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setActiveIndex((index) => Math.min(index + 1, Math.max(candidates.length - 1, 0)))
          } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            setActiveIndex((index) => Math.max(index - 1, 0))
          } else if (event.key === 'Enter' && candidates[activeIndex]) {
            commit(candidates[activeIndex])
          } else if (event.key === 'Escape') {
            setOpen(false)
          }
        }}
      />
      {open && keyword.trim() && (
        <div className="app-search__panel">
          {candidates.length === 0 ? (
            <div className="app-search__empty">
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="未找到匹配页面" />
            </div>
          ) : (
            candidates.map((item, itemIndex) => (
              <div
                key={item.path}
                className={`app-search__item${itemIndex === activeIndex ? ' app-search__item--active' : ''}`}
                onMouseDown={(event) => {
                  event.preventDefault()
                  commit(item)
                }}
                onMouseEnter={() => setActiveIndex(itemIndex)}
              >
                <span className="app-search__icon">
                  <FileSearchOutlined />
                </span>
                <span className="app-search__meta">
                  <span className="app-search__title">{item.title}</span>
                  <span className="app-search__trail">{item.trail}</span>
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
