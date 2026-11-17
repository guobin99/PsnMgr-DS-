import { App as AntdApp, ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { AuthProvider } from '@/store/auth'
import { TabsProvider } from '@/store/tabs'
import { AppRouter } from '@/router'
import { antdTheme } from '@/styles/theme'

/**
 * Provider 装配顺序：主题与中文 locale → 全局 message/modal → 会话 → 多页签 → 路由。
 * 会话必须早于路由（登录守卫要读登录态），多页签必须早于主框架（渲染时即需上下文）。
 */
export default function App() {
  return (
    <ConfigProvider locale={zhCN} theme={antdTheme} componentSize="middle">
      <AntdApp>
        <AuthProvider>
          <TabsProvider>
            <AppRouter />
          </TabsProvider>
        </AuthProvider>
      </AntdApp>
    </ConfigProvider>
  )
}
