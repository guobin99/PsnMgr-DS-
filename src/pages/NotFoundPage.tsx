import { Button, Result } from 'antd'
import { ArrowLeftOutlined, HomeOutlined } from '@ant-design/icons'
import { useLocation, useNavigate } from 'react-router-dom'
import { DASHBOARD_PATH } from '@/config/menu'

/** 404 结果页：保留主框架，提供返回工作台与上一页入口 */
export function NotFoundPage() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <div className="result-card" style={{ marginTop: 12 }}>
      <Result
        status="404"
        title="404 · 页面不存在"
        subTitle={
          <span>
            未找到路径 <code>{pathname}</code> 对应的页面。该地址可能已随版本调整，或您输入的地址有误。
          </span>
        }
        extra={[
          <Button key="back" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
            返回上一页
          </Button>,
          <Button key="home" type="primary" icon={<HomeOutlined />} onClick={() => navigate(DASHBOARD_PATH)}>
            返回工作台
          </Button>,
        ]}
      />
    </div>
  )
}
