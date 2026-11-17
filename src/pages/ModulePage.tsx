import { useMemo, useState } from 'react'
import { Alert, App, Button, DatePicker, Input, Select, Space, Table, Tag, Tooltip, type TableColumnsType } from 'antd'
import {
  CheckCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  SettingOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import { useLocation } from 'react-router-dom'
import { getModulePageMeta } from '@/config/menu'
import { usePermission } from '@/hooks/usePermission'
import { deriveActionPermission, describePermission } from '@/utils/permission'
import { NotFoundPage } from './NotFoundPage'

type RowStatus = '正常' | '停用' | '待处理' | '已完成'

interface DataRow {
  key: string
  col1: string
  col2: string
  col3: string
  col4: string
  col5: string
  col6: string
  status: RowStatus
}

const NAMES = ['张明', '李慧', '王强', '赵磊', '陈婷', '刘洋', '孙倩', '周涛', '吴敏', '郑凯']
const ORGS = ['信息中心', '财务处', '人力资源部', '保卫处', '后勤服务集团', '校务办公室']
const DEVICES = ['一号食堂 C-021', '二号食堂 C-018', '东门控制器 MJ-03', '南门控制器 MJ-07', '考勤机 KQ-112', '订餐机 DC-06']
const PERIODS = ['2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15', '2026-11-16']
const STATUS_LIST: RowStatus[] = ['正常', '正常', '待处理', '已完成', '正常', '停用']

function hashString(input: string): number {
  let hash = 2166136261
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash)
}

function makeRandom(seed: number): () => number {
  let state = seed || 1
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

const TABLE_HINT: Record<string, string> = {
  card: 'ST_Person、ST_Card、ST_PersonPhoto、ST_SupplyFund',
  consume: 'XF_Consume、ST_DailyDish、ST_Ware',
  attendance: 'KQ_Account、KQ_Daily、KQ_DailyHistory',
  access: 'MJ_NormalRecord、MJ_AbnormRecord、MJ_EventInfo',
  meal: 'DC_OrderData、DC_OrderDataSub、SF_OrderData',
  visitor: 'VisitorApply',
  utility: '水控采集记录、巡更记录',
  report: '各业务域汇总视图（只读）',
  system: 'ST_UserInfo、ST_RoleInfo、ST_RoleRight、ST_RightInfo',
}

/**
 * 业务占位页模板：187 条叶子路由共用。
 * 承接路由、面包屑、页签与三层权限验证，后续按需求文档逐页替换为真实业务页面。
 */
export function ModulePage() {
  const { pathname } = useLocation()
  const { can } = usePermission()
  const { message, modal } = App.useApp()
  const meta = getModulePageMeta(pathname)

  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<string>('all')
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([])

  const rows = useMemo<DataRow[]>(() => {
    if (!meta) return []
    const random = makeRandom(hashString(meta.path))
    return Array.from({ length: 9 }, (_, index) => {
      const person = NAMES[Math.floor(random() * NAMES.length)]
      const org = ORGS[Math.floor(random() * ORGS.length)]
      const device = DEVICES[Math.floor(random() * DEVICES.length)]
      const period = PERIODS[Math.floor(random() * PERIODS.length)]
      const serial = `NO${String(10240 + index * 7).padStart(6, '0')}`
      const amount = `¥${(random() * 480 + 12).toFixed(2)}`
      let cells: [string, string, string, string, string, string]
      if (meta.kind === 'report') {
        cells = [period, org, `${Math.floor(random() * 320 + 20)}`, amount, `${(random() * 18 + 2).toFixed(1)}%`, `${Math.floor(random() * 60 + 5)} 人次`]
      } else if (meta.kind === 'record') {
        cells = [`${period} ${String(7 + Math.floor(random() * 12)).padStart(2, '0')}:${String(Math.floor(random() * 60)).padStart(2, '0')}`, `${person} / 1000${Math.floor(random() * 9000 + 1000)}`, device, serial, amount, org]
      } else if (meta.kind === 'setting') {
        cells = [`${meta.title}项 ${index + 1}`, `${Math.floor(random() * 9 + 1)}`, index % 2 === 0 ? '全局' : '按部门', person, `${period} 09:${String(Math.floor(random() * 60)).padStart(2, '0')}`, serial]
      } else {
        cells = [serial, person, org, device, person, `${period} 08:${String(Math.floor(random() * 60)).padStart(2, '0')}`]
      }
      return {
        key: `${meta.path}-${index}`,
        col1: cells[0],
        col2: cells[1],
        col3: cells[2],
        col4: cells[3],
        col5: cells[4],
        col6: cells[5],
        status: STATUS_LIST[Math.floor(random() * STATUS_LIST.length)],
      }
    })
  }, [meta])

  const isExportPage = meta?.primaryAction === '导出数据'
  const canEdit = meta ? can(deriveActionPermission(meta.permission, 'edit')) : false
  const canDelete = meta ? can(deriveActionPermission(meta.permission, 'delete')) : false
  const canExport = meta ? can(deriveActionPermission(meta.permission, 'export')) : false

  if (!meta) return <NotFoundPage />

  const titles: Record<string, string[]> = {
    report: ['统计周期', '统计维度', '业务笔数', '金额合计', '占比', '人次'],
    record: ['发生时间', '对象 / 卡号', '终端 / 设备', '业务单号', '金额', '所属组织'],
    setting: ['参数项', '当前值', '生效范围', '更新人', '更新时间', '版本号'],
    master: ['业务编号', '名称', '所属组织', '关联终端', '经办人', '更新时间'],
  }
  const labels = titles[meta.kind]

  const columns: TableColumnsType<DataRow> = [
    ...labels.map((title, index) => ({
      title,
      dataIndex: `col${index + 1}` as keyof DataRow,
      ellipsis: true,
      width: index === 0 ? 160 : undefined,
    })),
    {
      title: '状态',
      dataIndex: 'status',
      width: 96,
      render: (value: RowStatus) => {
        const color = value === '正常' || value === '已完成' ? 'green' : value === '待处理' ? 'orange' : 'default'
        return (
          <Tag color={color} bordered={false}>
            {value}
          </Tag>
        )
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: () => (
        <Space size={4}>
          <Button type="link" size="small" style={{ padding: 0 }} onClick={() => message.info('查看详情待接入真实业务接口')}>
            查看
          </Button>
          {canEdit && !isExportPage && (
            <Button type="link" size="small" style={{ padding: 0 }} onClick={() => message.info(`编辑「${meta.title}」记录`)}>
              编辑
            </Button>
          )}
          {canDelete && !isExportPage && (
            <Button type="link" size="small" danger style={{ padding: 0 }} onClick={() => message.warning('删除为高风险操作，需二次确认并留痕')}>
              删除
            </Button>
          )}
        </Space>
      ),
    },
  ]

  const filteredRows = rows.filter((row) => {
    const matchKeyword =
      !keyword.trim() ||
      Object.values(row).some((value) => String(value).toLowerCase().includes(keyword.trim().toLowerCase()))
    const matchStatus = status === 'all' || row.status === status
    return matchKeyword && matchStatus
  })

  const tableHint = TABLE_HINT[meta.domainKey] ?? '对应业务表'

  return (
    <div className="module">
      <section className="module-head">
        <div>
          <h1 className="module-head__title">
            {meta.title}
            <Tag color="blue" bordered={false} style={{ fontWeight: 400 }}>
              {meta.domainLabel}
            </Tag>
            <Tag bordered={false} style={{ fontWeight: 400 }}>
              占位页
            </Tag>
          </h1>
          <p className="module-head__desc">{meta.description}</p>
          <div className="module-head__tags">
            <span className="perm-chip perm-chip--code">
              <SafetyCertificateOutlined /> {meta.permission}
            </span>
            <span className={`perm-chip ${canEdit ? 'perm-chip--on' : 'perm-chip--off'}`}>
              {canEdit ? <CheckCircleOutlined /> : <SettingOutlined />} 编辑 {canEdit ? '已授权' : '未授权'}
            </span>
            <span className={`perm-chip ${canExport ? 'perm-chip--on' : 'perm-chip--off'}`}>
              {canExport ? <CheckCircleOutlined /> : <SettingOutlined />} 导出 {canExport ? '已授权' : '未授权'}
            </span>
            <span className="perm-chip perm-chip--off">路由已接入 · 权限已生效</span>
          </div>
        </div>
        <div className="module-head__actions">
          {isExportPage &&
            (canExport ? (
              <Button icon={<DownloadOutlined />} onClick={() => message.success('已提交导出任务，可在「导出任务」中下载')}>
                {meta.primaryAction}
              </Button>
            ) : null)}
          {!isExportPage && canEdit && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => message.info(`新增${meta.title}`)}>
              {meta.primaryAction}
            </Button>
          )}
          <Tooltip title="重新加载本页数据">
            <Button icon={<ReloadOutlined />} onClick={() => message.success('已刷新')} />
          </Tooltip>
        </div>
      </section>

      {!canEdit && !isExportPage && (
        <Alert
          type="info"
          showIcon
          message={`当前角色对「${meta.title}」仅有查看权限`}
          description={`页面级权限 ${meta.permission} 已通过，操作级权限 ${deriveActionPermission(meta.permission, 'edit')} 未授予，新增与编辑按钮按规范隐藏；后端接口仍会按同一权限码独立鉴权。`}
        />
      )}

      <section className="module-filter">
        <span className="module-filter__label">关键词</span>
        <Input
          allowClear
          value={keyword}
          prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
          placeholder={`搜索${meta.title}记录`}
          style={{ width: 220 }}
          onChange={(event) => setKeyword(event.target.value)}
        />
        <span className="module-filter__label">状态</span>
        <Select
          value={status}
          style={{ width: 130 }}
          onChange={setStatus}
          options={[
            { value: 'all', label: '全部状态' },
            { value: '正常', label: '正常' },
            { value: '待处理', label: '待处理' },
            { value: '已完成', label: '已完成' },
            { value: '停用', label: '停用' },
          ]}
        />
        <span className="module-filter__label">日期范围</span>
        <DatePicker.RangePicker style={{ width: 250 }} placeholder={['开始日期', '结束日期']} />
        <Button type="primary" icon={<SearchOutlined />} onClick={() => message.success(`已按条件查询：${filteredRows.length} 条`)}>
          查询
        </Button>
        <Button
          onClick={() => {
            setKeyword('')
            setStatus('all')
            message.info('已重置查询条件')
          }}
        >
          重置
        </Button>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#94a3b8' }}>共 {filteredRows.length} 条</span>
      </section>

      <section className="module-table">
        <div className="module-table__head">
          <span className="module-table__title">数据列表</span>
          <div className="module-table__tools">
            {selectedKeys.length > 0 && canDelete && !isExportPage && (
              <Button
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={() =>
                  modal.confirm({
                    title: `确认删除选中的 ${selectedKeys.length} 条记录？`,
                    content: '批量删除属于高风险动作，操作将写入后端审计日志，删除后不可恢复。',
                    okText: '确认删除',
                    okButtonProps: { danger: true },
                    cancelText: '取消',
                    onOk: () => {
                      setSelectedKeys([])
                      message.success('已提交删除请求（示例）')
                    },
                  })
                }
              >
                批量删除（{selectedKeys.length}）
              </Button>
            )}
            <Button size="small" icon={<DownloadOutlined />} disabled={!canExport} onClick={() => message.success('已提交导出任务')}>
              导出
            </Button>
          </div>
        </div>
        <Table<DataRow>
          size="middle"
          rowKey="key"
          columns={columns}
          dataSource={filteredRows}
          rowSelection={
            canDelete && !isExportPage
              ? {
                  selectedRowKeys: selectedKeys,
                  onChange: setSelectedKeys,
                }
              : undefined
          }
          pagination={{
            pageSize: 8,
            showSizeChanger: false,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          scroll={{ x: 960 }}
        />
      </section>

      <div className="module-note">
        <SettingOutlined style={{ marginTop: 3 }} />
        <div>
          <div>
            接口约定：<code>GET {meta.path}/query</code> · <code>POST {meta.path}/save</code> ·{' '}
            <code>POST {meta.path}/remove</code> · <code>POST {meta.path}/export</code>
          </div>
          <div>
            数据口径：{tableHint}（与 CS 共用，结构只增不删）；页面权限{' '}
            <code>{describePermission(meta.permission)}</code>，资源段 <code>{meta.resource}</code>。
          </div>
          <div>
            本页为布局与权限阶段的占位模板，表格数据为示例；接入真实业务时只替换页面组件，路由、菜单、面包屑、页签与权限判定均不需要改动。
          </div>
        </div>
      </div>
    </div>
  )
}
