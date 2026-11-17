import { Spin } from 'antd'

/** 路由出口内的加载态：主框架与侧边栏保持挂载，不出现整屏闪烁 */
export function PageLoading({ label = '页面加载中…' }: { label?: string }) {
  return (
    <div className="app-page-loading">
      <Spin size="large" />
      <span>{label}</span>
    </div>
  )
}
