import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Col,
  DatePicker,
  Descriptions,
  Drawer,
  Empty,
  Input,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DiffOutlined, DownloadOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { usePermission } from '@/hooks/usePermission';
import type { OperLog } from '@/types/systemConfig';
import {
  downloadText,
  exportOperLogs,
  fetchOperLogDetail,
  fetchOperLogDiff,
  fetchOperLogs,
} from '@/services/systemConfig';
import { formatDateTime } from './shared';

const moduleOptions = [
  { value: 'operator', label: '操作员' },
  { value: 'role', label: '角色' },
  { value: 'permission', label: '权限' },
  { value: 'deptRight', label: '部门权限' },
  { value: 'deviceRight', label: '设备权限' },
  { value: 'subsystemRight', label: '子系统权限' },
  { value: 'cashierAuth', label: '出纳授权' },
  { value: 'param', label: '系统参数' },
  { value: 'dict', label: '数据字典' },
  { value: 'integration', label: '接口与集成' },
  { value: 'maintain', label: '数据维护' },
  { value: 'blacklist', label: '黑名单' },
  { value: 'log', label: '安全审计' },
];

const actionOptions = [
  { value: 'create', label: '新增' },
  { value: 'update', label: '修改' },
  { value: 'delete', label: '删除' },
  { value: 'add', label: '加入' },
  { value: 'release', label: '释放' },
  { value: 'import', label: '导入' },
  { value: 'export', label: '导出' },
  { value: 'assign', label: '授权' },
  { value: 'resetPwd', label: '重置密码' },
  { value: 'changeSecret', label: '更换密钥' },
  { value: 'rollbackSecret', label: '回滚密钥' },
  { value: 'cleanup', label: '数据清理' },
  { value: 'test', label: '连通测试' },
];

function prettyJson(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  return JSON.stringify(value, null, 2);
}

/** 操作审计：合并 ST_OptLog 与 BS_OperLog，BS 记录可查看前后值差异 */
export default function OperLogPage() {
  const { message } = App.useApp();
  const { has } = usePermission();
  const canExport = has('system:log:oper:export');

  const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>([dayjs().subtract(7, 'day'), dayjs()]);
  const [userNo, setUserNo] = useState('');
  const [userName, setUserName] = useState('');
  const [source, setSource] = useState<string | undefined>();
  const [module, setModule] = useState<string | undefined>();
  const [action, setAction] = useState<string | undefined>();
  const [targetKey, setTargetKey] = useState('');
  const [result, setResult] = useState<string | undefined>();
  const [keyword, setKeyword] = useState('');
  const [highRiskOnly, setHighRiskOnly] = useState(false);

  const [rows, setRows] = useState<OperLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [detail, setDetail] = useState<{ row: OperLog; note: string } | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [diff, setDiff] = useState<{ before: unknown; after: unknown; traceId?: string } | null>(null);

  const baseParams = useMemo(() => {
    const params: Record<string, unknown> = {};
    if (range?.[0]) params.begin = range[0].format('YYYY-MM-DD');
    if (range?.[1]) params.end = range[1].format('YYYY-MM-DD');
    if (userNo.trim()) params.userNo = userNo.trim();
    if (userName.trim()) params.userName = userName.trim();
    if (source) params.source = source;
    if (module) params.module = module;
    if (action) params.action = action;
    if (targetKey.trim()) params.targetKey = targetKey.trim();
    if (result !== undefined && result !== '') params.result = Number(result);
    if (keyword.trim()) params.keyword = keyword.trim();
    if (highRiskOnly) params.highRiskOnly = true;
    return params;
  }, [range, userNo, userName, source, module, action, targetKey, result, keyword, highRiskOnly]);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchOperLogs({ ...baseParams, page, pageSize });
      setRows(data.items);
      setTotal(data.total);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载操作审计失败');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [baseParams, message, page, pageSize]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const openDetail = async (row: OperLog) => {
    setDiff(null);
    try {
      const data = await fetchOperLogDetail(row.id, row.source);
      setDetail({ row: data.row, note: data.note });
      setDetailOpen(true);
      if (data.row.hasDiff) {
        try {
          setDiff(await fetchOperLogDiff(row.id));
        } catch {
          setDiff(null);
        }
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载详情失败');
    }
  };

  const doExport = async () => {
    setExporting(true);
    try {
      const exported = await exportOperLogs(baseParams);
      downloadText(exported.fileName, exported.content);
      message.success(
        `已导出 ${exported.rowCount ?? 0} 行${exported.truncated ? '（已达上限，请缩小时间范围）' : ''}`,
      );
    } catch (error) {
      message.error(error instanceof Error ? error.message : '导出失败');
    } finally {
      setExporting(false);
    }
  };

  const columns: ColumnsType<OperLog> = [
    { title: '时间', dataIndex: 'time', width: 150, render: (value: string) => formatDateTime(value) },
    {
      title: '来源',
      dataIndex: 'source',
      width: 80,
      render: (value: string) => <Tag color={value === 'BS' ? 'purple' : 'blue'}>{value}</Tag>,
    },
    { title: '账号', dataIndex: 'userNo', width: 110, render: (value?: string | null) => value || '-' },
    { title: '姓名', dataIndex: 'userName', width: 100, render: (value?: string | null) => value || '-' },
    { title: '模块', dataIndex: 'module', width: 120 },
    {
      title: '动作',
      dataIndex: 'action',
      width: 130,
      render: (value: string, row) => (
        <Space size={4}>
          <Tag color={row.highRisk ? 'volcano' : 'default'}>{value}</Tag>
          {row.highRisk && <Tag color="red">高风险</Tag>}
        </Space>
      ),
    },
    { title: '目标', dataIndex: 'target', width: 130, ellipsis: true },
    { title: '对象键', dataIndex: 'targetKey', width: 130, ellipsis: true },
    {
      title: '结果',
      dataIndex: 'result',
      width: 90,
      render: (value: number) => (value === 0 ? <Tag color="green">成功</Tag> : <Tag color="red">失败</Tag>),
    },
    { title: 'IP', dataIndex: 'ip', width: 130, render: (value?: string | null) => value || '-' },
    { title: '说明', dataIndex: 'message', ellipsis: true },
    {
      title: '操作',
      width: 90,
      fixed: 'right',
      render: (_value, row) => (
        <Button size="small" type="link" onClick={() => openDetail(row)}>
          {row.hasDiff ? '详情/对比' : '详情'}
        </Button>
      ),
    },
  ];

  return (
    <div className="system-workspace system-page-single">
      <Card size="small" className="filter-card">
        <Space wrap size={10}>
          <DatePicker.RangePicker
            value={range as never}
            onChange={(values) => setRange(values as [dayjs.Dayjs, dayjs.Dayjs] | null)}
            allowClear={false}
          />
          <Input
            allowClear
            style={{ width: 120 }}
            placeholder="账号"
            value={userNo}
            onChange={(event) => setUserNo(event.target.value)}
          />
          <Input
            allowClear
            style={{ width: 110 }}
            placeholder="姓名"
            value={userName}
            onChange={(event) => setUserName(event.target.value)}
          />
          <Select
            allowClear
            style={{ width: 110 }}
            placeholder="来源"
            value={source}
            onChange={setSource}
            options={[
              { value: 'BS', label: 'BS' },
              { value: 'CS', label: 'CS' },
            ]}
          />
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            style={{ width: 140 }}
            placeholder="模块"
            value={module}
            onChange={setModule}
            options={moduleOptions}
          />
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            style={{ width: 140 }}
            placeholder="动作"
            value={action}
            onChange={setAction}
            options={actionOptions}
          />
          <Input
            allowClear
            style={{ width: 130 }}
            placeholder="对象键"
            value={targetKey}
            onChange={(event) => setTargetKey(event.target.value)}
          />
          <Select
            allowClear
            style={{ width: 110 }}
            placeholder="结果"
            value={result}
            onChange={setResult}
            options={[
              { value: '0', label: '成功' },
              { value: '1', label: '失败' },
            ]}
          />
          <Input
            allowClear
            style={{ width: 160 }}
            placeholder="说明/键关键词"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
          <Checkbox checked={highRiskOnly} onChange={(event) => setHighRiskOnly(event.target.checked)}>
            仅看高风险
          </Checkbox>
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={() => {
              setPage(1);
              loadRows();
            }}
          >
            查询
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              setRange([dayjs().subtract(7, 'day'), dayjs()]);
              setUserNo('');
              setUserName('');
              setSource(undefined);
              setModule(undefined);
              setAction(undefined);
              setTargetKey('');
              setResult(undefined);
              setKeyword('');
              setHighRiskOnly(false);
              setPage(1);
            }}
          >
            重置
          </Button>
          <Button icon={<DownloadOutlined />} loading={exporting} disabled={!canExport} onClick={doExport}>
            导出
          </Button>
        </Space>
      </Card>

      <Card size="small">
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="BS 记录写入完整前后值与 traceId，可精确追溯；CS 记录来自 ST_OptLog，没有前后值且可能被 CS 端清理。"
        />
        <div className="system-toolbar">
          <Typography.Text type="secondary">共 {total} 条记录</Typography.Text>
        </div>
        <Table
          rowKey={(row) => `${row.source}-${row.id}`}
          size="small"
          loading={loading}
          dataSource={rows}
          columns={columns}
          scroll={{ x: 1500 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (value) => `共 ${value} 条`,
            onChange: (nextPage, nextSize) => {
              setPage(nextPage);
              setPageSize(nextSize);
            },
          }}
          locale={{ emptyText: <Empty description="所选条件下没有操作审计记录" /> }}
        />
      </Card>

      <Drawer
        title={detail ? `操作审计 · ${detail.row.module ?? ''} / ${detail.row.action ?? ''}` : '操作审计详情'}
        width={detail?.row.hasDiff ? 820 : 560}
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setDiff(null);
        }}
      >
        {detail && (
          <>
            <Alert type="info" showIcon style={{ marginBottom: 12 }} message={detail.note} />
            <Descriptions
              size="small"
              column={2}
              bordered
              items={[
                { key: 'source', label: '来源', children: detail.row.source },
                { key: 'id', label: '记录号', children: detail.row.id },
                { key: 'time', label: '时间', children: formatDateTime(detail.row.time) },
                { key: 'userNo', label: '账号', children: detail.row.userNo || '-' },
                { key: 'userName', label: '姓名', children: detail.row.userName || '-' },
                { key: 'module', label: '模块', children: detail.row.module || '-' },
                { key: 'action', label: '动作', children: detail.row.action || '-' },
                {
                  key: 'result',
                  label: '结果',
                  children: detail.row.result === 0 ? <Tag color="green">成功</Tag> : <Tag color="red">失败</Tag>,
                },
                { key: 'target', label: '目标', children: detail.row.target || '-' },
                { key: 'targetKey', label: '对象键', children: detail.row.targetKey || '-' },
                { key: 'ip', label: 'IP', children: detail.row.ip || '-' },
                { key: 'trace', label: '链路追踪', children: detail.row.traceId || '-' },
                { key: 'message', label: '说明', span: 2, children: detail.row.message || '-' },
              ]}
            />

            {detail.row.hasDiff && (
              <>
                <Typography.Title level={5} style={{ marginTop: 16 }}>
                  <DiffOutlined /> 变更前后
                </Typography.Title>
                {!diff ? (
                  <Empty description="未能读取前后值" />
                ) : (
                  <Row gutter={12}>
                    <Col span={12}>
                      <Typography.Text strong>变更前</Typography.Text>
                      <pre
                        style={{
                          margin: '6px 0 0',
                          padding: 10,
                          maxHeight: 360,
                          overflow: 'auto',
                          background: '#fafafa',
                          border: '1px solid #f0f0f0',
                          borderRadius: 6,
                          fontSize: 12,
                          lineHeight: 1.7,
                        }}
                      >
                        {prettyJson(diff.before)}
                      </pre>
                    </Col>
                    <Col span={12}>
                      <Typography.Text strong>变更后</Typography.Text>
                      <pre
                        style={{
                          margin: '6px 0 0',
                          padding: 10,
                          maxHeight: 360,
                          overflow: 'auto',
                          background: '#f6ffed',
                          border: '1px solid #d9f7be',
                          borderRadius: 6,
                          fontSize: 12,
                          lineHeight: 1.7,
                        }}
                      >
                        {prettyJson(diff.after)}
                      </pre>
                    </Col>
                  </Row>
                )}
              </>
            )}
          </>
        )}
      </Drawer>
    </div>
  );
}
