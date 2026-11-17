export function BrandLogo({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={`app-brand${collapsed ? ' app-brand--collapsed' : ''}`}>
      <div className="app-brand__mark">脸</div>
      {!collapsed && (
        <div className="app-brand__text">
          <div className="app-brand__title">人脸通 · BS 管理平台</div>
          <div className="app-brand__subtitle">Card · Consume · Access</div>
        </div>
      )}
    </div>
  )
}
