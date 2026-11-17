# 人脸通 BS 管理平台 · 前端（布局 / 导航 / 权限控制）

React 18 + TypeScript + Vite 5 + Ant Design 5 实现的 BS 端管理前端骨架。本轮交付覆盖**主框架布局、三级导航、路由派生与三层权限控制**，187 个业务页面统一由占位模板承接，后续逐页替换真实业务组件时不需要改动框架、路由与权限逻辑。

- 设计依据：`人脸通BS系统-布局与导航及权限控制详细设计文档(MiMo)`、`人脸通BS系统需求文档(MiMo)`
- 数据基线：与 CS 人脸通共用 SQL Server，结构只增不删；BS 一律经 .NET RESTful API 访问数据
- 权限基线：沿用 CS 的 `ST_UserInfo / ST_RoleInfo / ST_RoleRight / ST_RightInfo`，后端映射为三段式权限码下发

## 快速开始

```bash
npm install                # 依赖源可用 npmmirror 镜像
npm run dev                # http://127.0.0.1:5273 ，/api 代理到 http://localhost:5187
npm run typecheck          # tsc --noEmit
npm run build              # 类型检查 + 生产构建
```

登录页下方提供六个演示账号，密码统一 `123456`，点击标签即填入。开发环境后端未启动时自动回退到本地演示角色（`VITE_ENABLE_DEMO_LOGIN=true`）；生产构建该开关为 `false`，登录必须走真实后端。

## 技术栈

| 层 | 选型 | 说明 |
| --- | --- | --- |
| 框架 | React 18.3 + TypeScript 5.6 | 函数组件 + Hooks，`strict` / `noUnusedLocals` |
| 构建 | Vite 5.4 | 别名 `@ → src`，端口 5273，`/api` 代理 |
| UI | Ant Design 5.29 + @ant-design/icons | 布局、菜单、页签、表格、表单全部取自 antd |
| 路由 | react-router-dom 6.30 | 浏览器历史模式，嵌套路由 + 逐条懒加载 |
| 请求 | axios | 单实例、双拦截器、统一返回体解包 |
| 状态 | React Context | 仅会话与多页签两处，不引入 Redux/zustand |

## 目录结构

```
src/
├─ App.tsx / main.tsx            根组件与入口（Provider 装配、主题与中文 locale）
├─ config/
│  ├─ menu.tsx                   导航总装 + 11 个派生工具（单一数据源）
│  ├─ menu/{builder,card,consume,attendance,access,meal,visitor,utility,report,system}
│  │                             defineDomain 紧凑声明 → NavNode 树；九个业务域共 36 分组 187 页面
│  └─ roles.ts                   六个演示角色、六个演示账号、会话用户构造
├─ layouts/
│  ├─ AdminLayout.tsx            主框架：侧边栏 / 顶栏 / 多页签 / 内容区
│  └─ components/                BrandLogo、SideMenu、HeaderBar、DomainSwitch、GlobalSearch、UserMenu、AppBreadcrumb、TabsBar
├─ router/
│  ├─ index.tsx                  登录路由、域重定向、187 条叶子路由、403/404
│  ├─ RequireAuth.tsx            登录守卫（记录来源路径）
│  └─ PermissionGate.tsx         页面级权限守卫（内嵌 403）
├─ pages/                        LoginPage、DashboardPage、ModulePage、ForbiddenPage、NotFoundPage
├─ services/                     http.ts（axios 与错误归一化）、auth.ts（登录/档案/退出/演示回退）
├─ store/                        auth.tsx（会话）、tabs.tsx（多页签）
├─ hooks/usePermission.ts        操作级权限判定封装
├─ utils/                        permission.ts（匹配算法）、storage.ts（本地存储）
├─ styles/                       global.css（设计变量与全部布局样式）、theme.ts（antd 主题）
└─ types/navigation.ts           NavNode、TabItem、SessionUser、ModulePageMeta 等
```

## 布局口径

| 区域 | 尺寸 | 关键约束 |
| --- | --- | --- |
| 侧边栏 | 展开 240 / 折叠 64，撑满视口 | 深色渐变底，`lg` 断点以下自动折叠，折叠状态持久化 |
| 顶栏外壳 `.app-header` | 高 56，白底 + 1px 分隔线 | 纯外壳：不设 flex、不设内边距，避免按内容收缩 |
| 顶栏内容行 `.app-header__bar` | 高 100%，左右内边距 12 / 16 | flex 排布 + 弹性占位，右侧动作区永远贴住右边界 |
| 多页签栏 | 高 40 | 卡片型页签 + 右侧页签操作下拉，工作台固定不可关闭 |
| 内容区 | 上 12 / 左右 16 / 下 24 | 面包屑 + 路由出口，切换页面不卸载主框架 |

**外壳与内容行不得复用同一类名**，弹性占位元素必须保留——这是顶栏右对齐缺陷的修复约束（详见设计文档 10.2）。

## 导航与路由

- 导航树是菜单、路由、面包屑、页签标题、搜索索引与占位页元信息的**唯一数据源**（`config/menu.tsx`）。
- 规模：工作台 1 + 业务域 9 + 分组 36 + 叶子 187 = **233 个菜单节点**，188 条可路由路径（含工作台），197 个权限码字面量。
- 层级键规则：业务域为域键（`card`），分组为 `域键-group-分组英文`（`card-group-person-org`），叶子由路径派生（`/card/account → card-account`）。分组键与叶子键必须全局唯一，否则 React 重复键告警并导致选中态错乱。
- 派生工具：`flattenMenu / flattenLeaves / findNodeByPath / getMenuTrail / getDomainOf / getBreadcrumbs / getOpenKeys / filterMenuByPermission / buildDomainEntries / getModulePageMeta / buildMenuSearchIndex / searchMenu`。
- 路由：`/login` 公开；`/` 与 `/各域键` 重定向到首个可见叶子；187 条叶子由导航树生成，每条独立 `Suspense` 边界并包一层 `PermissionGate`；`/403`、`*`（404）保留在主框架内。
- 占位页主操作派生：页面名称命中「报表/明细/汇总/统计/总览/台账/记录/日志/流水/查询」显示「导出数据」，其余显示「新增{页面名}」；操作级权限按 `资源:edit / :delete / :export` 派生。

## 权限控制

三层递进：

1. **菜单级**（`filterMenuByPermission`）：叶子未命中权限即移除；分组与业务域在子节点全空时不渲染。侧边栏、顶栏业务域下拉、全局搜索共用同一份过滤结果——看得到的一定能进。
2. **页面级**（`PermissionGate`）：兜住手工输入地址、书签与外部链接，未命中在路由出口内渲染 403（保留主框架与页签）。
3. **操作级**（`usePermission`）：按钮按 `资源:操作` 判定，权限不足优先隐藏而非置灰；批量删除、批量下发等高风险动作另加二次确认与后端留痕。

匹配算法（`utils/permission.ts`）顺序不可调整：无要求即通过 → 无权限即拒绝 → 精确匹配 → 全局通配 `*` → 前缀通配 `card:*`（`card:person` 不命中 `card:person:view`）。

| 演示角色 | 部门 | 权限码集合 |
| --- | --- | --- |
| R_ADMIN 系统管理员 | 信息中心 | `*` |
| R_CASHIER 卡务出纳 | 财务处 | `dashboard:view`、`card:*`、`consume:record/report/summary:*`、`report:*`、`system:log:*` |
| R_HR 人事考勤 | 人力资源部 | `dashboard:view`、`attendance:*`、`card:person/dept/face:view`、`card:report:roster`、`visitor:*`、`report:overview/attendance` |
| R_SECURITY 门禁安保 | 保卫处 | `dashboard:view`、`access:*`、`visitor:*`、`card:person/face:view`、`report:overview/access` |
| R_CANTEEN 食堂消费 | 后勤服务集团 | `dashboard:view`、`consume:*`、`meal:*`、`card:person:view`、`report:overview/consume/meal` |
| R_VIEWER 运营查看 | 校务办公室 | `dashboard:view`、`report:*` |

前端权限只是表现层：后端必须对每个业务接口独立鉴权，越权返回 403 且不返回数据；数据范围（本人/本部门/本机台/全部）由后端按 `ST_DeptRight`、`ST_MOCRight` 执行，前端不做数据裁剪。

## 状态与存储

| 键 | 内容 | 时机 |
| --- | --- | --- |
| `psnmgr.auth.token` | 访问令牌 | 登录成功写入，请求拦截器读取 |
| `psnmgr.auth.user` | 会话用户（含权限集合） | 登录成功写入，启动恢复会话 |
| `psnmgr.layout.collapsed` | 侧边栏折叠状态 | 用户切换折叠 |
| `psnmgr.login.userName` | 记住的登录账号 | 勾选记住账号时 |

页签**不持久化**：刷新后仅保留工作台页签并由主框架补开当前页，避免跨版本路径变更产生失效页签。会话恢复在一次同步读取中完成，首屏不会先渲染登录页再跳回。

## 接口约定

| 接口 | 方法 | 用途 | 说明 |
| --- | --- | --- | --- |
| `/auth/login` | POST | 登录 | 请求体同时携带 `userName` 与 `userNo`，兼容文档约定与现有 .NET `LoginRequest`；响应兼容 `token/user` 与 `access_token/st_userinfo` |
| `/auth/profile` | POST | 取档案与权限 | 凭令牌 |
| `/auth/logout` | POST | 退出 | 失败也继续本地清理 |
| `/{模块}/{资源}/query · save · remove · export` | GET/POST | 业务接口 | 与权限码资源段同构，如 `card:person:view ↔ /card/person/query` |

错误归一化：401 → 派发全局事件 `psnmgr:unauthorized` 并清理会话跳登录页（并发 401 只清理一次）；403 → 页面级渲染 403 / 接口级提示「无权限访问该资源」；5xx 或代理不可达且响应体非统一返回体 → 按「服务不可用」处理，开发环境触发演示回退。

## 界面预览

| 登录页 | 工作台 |
| --- | --- |
| ![登录页](docs/screenshots/login.png) | ![工作台](docs/screenshots/dashboard.png) |

| 业务占位页（主数据） | 业务占位页（记录，只读） |
| --- | --- |
| ![人员档案](docs/screenshots/module-master.png) | ![通行记录](docs/screenshots/module-record.png) |

| 运营查看角色（菜单裁剪） | 直连越权 403 |
| --- | --- |
| ![运营查看](docs/screenshots/viewer-dashboard.png) | ![403](docs/screenshots/forbidden-403.png) |

## 验证记录
- `npm run typecheck`：通过；`npm run build`：3135 个模块，约 13s，产物 `vendor-antd 986 kB / vendor-react 166 kB / index 105 kB / DashboardPage 10.7 kB / ModulePage 7.4 kB`。
- 顶栏几何（无横向溢出，右侧恒 16px、内容行宽度等于外壳宽度）：

| 视口 | 内容行宽度 | 右侧动作区距右沿 | 首元素左边缘 | 横向溢出 |
| --- | --- | --- | --- | --- |
| 1440（展开） | 1200 | 16 | 252 | 0 |
| 1100（展开） | 860 | 16 | 252 | 0 |
| 900（自动折叠） | 836 | 16 | 76 | 0 |
| 700（自动折叠） | 636 | 16 | 76 | 0 |

- 行为验证：未登录跳登录并携带来源；`/card` → `/card/person`、`/attendance` → `/attendance/account`、`/utility` → `/utility/water/card-type` 域重定向正确；关闭激活页签回退到相邻页签或工作台；运营查看角色菜单仅剩报表中心，直连 `/system/operator` 渲染 403 且保留主框架与页签；侧边栏筛选与全局搜索（含层级链路面包屑式提示）跳转正常。

## 已知限制与后续

1. 187 条路由均指向 `ModulePage` 占位模板，表格数据为示例，需按需求文档逐页替换真实业务页面。
2. 权限码与 CS `ST_RightInfo` 的逐条映射由后端完成（建议新增表 `BS_RightCodeMap`），前端清单见 `docs/菜单与权限码清单.md`，上线前需做「权限码 ↔ Right_ID ↔ 接口」三向核对。
3. 演示回退仅用于开发环境；生产构建演示开关关闭，必须由后端下发权限集合。
4. 搜索为名称/路径的包含匹配，不含拼音与首字母；页签不持久化；界面仅简体中文。
5. 顶栏通知角标为静态占位（6），待接入真实待办接口。
