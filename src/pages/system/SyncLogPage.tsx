import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Drawer,
  Empty,
  Input,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DownloadOutlined, RedoOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { usePermission } from '@/hooks/usePermission';
import type { SyncLog } from '@/types/systemConfig';
import {
  downloadText,
  exportSyncLogs,
  fetchSyncLogDetail,
  fetchSyncLogs,
  retrySyncLog,
} from '@/services/systemConfig';
import { formatDateTime } from './shared';

const statusMeta: Record<string, { text: string; color: string }> = {
  pending: { text: '待执行', color: 'default' },
  success: { text: '成功', color: 'green' },
  failed: { text: '失败', color: 'red' },
  partial: { text: '部分成功', color: 'orange' },
  running: { text: '进行中', color: 'processing' },
  unknown: { text: '未知', color: 'default' },
};

const defaultSources: Record<string, string> = {
  BS: 'BS 任务',
  MOC: '名单下发',
  WX: '微信支付',
  COLLECT: '采集服务',
  ORDER: '订餐订单',
  ACCESS: '门禁流水',
};

/** 同步日志：聚合六类下发/回调/采集记录，支持失败任务重试 */
export default function SyncLogPage() {
  const { message } = App.useApp();
  const { has } = usePermission();
  const canExport = has('system:log:sync:export');
  const canRetry = has('system:log:sync:retry');

  const [sources, setSources] = useState<Record<string, string>>(defaultSources);
  const [source, setSource] = useState<string | undefined>();

  const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>([dayjs().subtract(7, 'day'), dayjs()]);
  const [status, setStatus] = useState<string | undefined>();
  const [syncType, setSyncType] = useState<string | undefined>();
  const [direction, setDirection] = useState<string | undefined>();
  const [taskCode, setTaskCode] = useState('');
  const [target, setTarget] = useState('');

  const [rows, setRows] = useState<SyncLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [detail, setDetail] = useState<{ row: SyncLog; note: string } | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const baseParams = useMemo(() => {
    const params: Record<string, unknown> = {};
    if (range?.[0]) params.begin = range[0].format('YYYY-MM-DD');
    if (range?.[1]) params.end = range[1].format('YYYY-MM-DD');
    if (source) params.source = source;
    if (status) params.status = status;
    if (syncType) params.syncType = syncType;
    if (direction) params.direction = direction;
    if (taskCode.trim()) params.taskCode = taskCode.trim();
    if (target.trim()) params.target = target.trim();
    return params;
  }, [range, source, status, syncType, direction, taskCode, target]);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchSyncLogs({ ...baseParams, page, pageSize });
      setRows(data.items);
      setTotal(data.total);
      if (data.sources) setSources(data.sources);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载同步日志失败');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [baseParams, message, page, pageSize]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const sourceEntries = useMemo(() => Object.entries(sources), [sources]);

  const openDetail = async (row: SyncLog) => {
    try {
      const data = await fetchSyncLogDetail(row.source, row.id);
      setDetail({ row: { ...data.row, sourceLabel: sources[data.row.source] ?? data.row.source }, note: data.note });
      setDetailOpen(true);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载详情失败');
    }
  };

  const doRetry = async (row: SyncLog) => {
    try {
      const result = await retrySyncLog(row.id);
      message.success(`已创建重试记录 ${result.retryId}`);
      await loadRows();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '重试失败');
    }
  };

  const doExport = async () => {
    setExporting(true);
    try {
      const exported = await exportSyncLogs(baseParams);
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

  const columns: ColumnsType<SyncLog> = [
    { title: '时间', dataIndex: 'time', width: 150, render: (value: string) => formatDateTime(value) },
    {
      title: '来源',
      dataIndex: 'source',
      width: 110,
      render: (value: string, row) => <Tag color="blue">{row.sourceLabel ?? sources[value] ?? value}</Tag>,
    },
    { title: '任务编码', dataIndex: 'taskCode', width: 160, render: (value?: string | null) => value || '-' },
    { title: '类型', dataIndex: 'syncType', width: 100, render: (value?: string | null) => value || '-' },
    { title: '方向', dataIndex: 'direction', width: 90, render: (value?: string | null) => value || '-' },
    { title: '目标', dataIndex: 'target', width: 140, ellipsis: true, render: (value?: string | null) => value || '-' },
    { title: '对象键', dataIndex: 'targetKey', width: 130, ellipsis: true, render: (value?: string | null) => value || '-' },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: string) => <Tag color={statusMeta[value]?.color}>{statusMeta[value]?.text ?? value}</Tag>,
    },
    {
      title: '耗时',
      dataIndex: 'elapsed',
      width: 90,
      render: (value?: number | null) => (value == null ? '-' : `${value} ms`),
    },
    { title: '说明', dataIndex: 'message', ellipsis: true, render: (value?: string | null) => value || '-' },
    {
      title: '操作',
      width: 130,
      fixed: 'right',
      render: (_value, row) => (
        <Space size={0}>
          <Button size="small" type="link" onClick={() => openDetail(row)}>
            详情
          </Button>
          {row.canRetry && (
            <Button size="small" type="link" disabled={!canRetry} onClick={() => doRetry(row)}>
              重试
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="system-page system-workspace">
      <Card size="small" className="system-context-card">
        <h3 className="system-context-title">日志来源</h3>
        <Spin spinning={false}>
          <div className="system-context-list">
            <button
              type="button"
              className={`system-context-item${source === undefined ? ' is-active' : ''}`}
              onClick={() => {
                setSource(undefined);
                setPage(1);
              }}
            >
              <strong>全部来源</strong>
              <span>合并展示六类记录</span>
            </button>
            {sourceEntries.map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`system-context-item${source === key ? ' is-active' : ''}`}
                onClick={() => {
                  setSource(key);
                  setPage(1);
                }}
              >
                <strong>{label}</strong>
                <span>{key}</span>
              </button>
            ))}
          </div>
        </Spin>
        <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
          只有 BS 任务的失败记录支持重试；既有业务表记录只读。
        </Typography.Text>
      </Card>

      <div>
        <Card size="small" className="filter-card">
          <Space wrap size={10}>
            <DatePicker.RangePicker
              value={range as never}
              onChange={(values) => setRange(values as [dayjs.Dayjs, dayjs.Dayjs] | null)}
              allowClear={false}
            />
            <Select
              allowClear
              style={{ width: 120 }}
              placeholder="状态"
              value={status}
              onChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
              options={Object.entries(statusMeta).map(([value, meta]) => ({ value, label: meta.text }))}
            />
            <Input
              allowClear
              style={{ width: 140 }}
              placeholder="任务编码"
              value={taskCode}
              onChange={(event) => setTaskCode(event.target.value)}
            />
            <Input
              allowClear
              style={{ width: 140 }}
              placeholder="类型"
              value={syncType}
              onChange={(event) => setSyncType(event.target.value)}
            />
            <Input
              allowClear
              style={{ width: 120 }}
              placeholder="方向"
              value={direction}
              onChange={(event) => setDirection(event.target.value)}
            />
            <Input
              allowClear
              style={{ width: 150 }}
              placeholder="目标或对象键"
              value={target}
              onChange={(event) => setTarget(event.target.value)}
            />
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
                setStatus(undefined);
                setSyncType(undefined);
                setDirection(undefined);
                setTaskCode('');
                setTarget('');
                setPage(1);
              }}
            >
              重置
            </Button>
            <Button icon={<RedoOutlined />} loading={loading} onClick={loadRows}>
              刷新
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
            message="六类记录字段差异较大，按统一视图适配后合并分页；详情中的请求与响应摘要已脱敏（手机号、身份证、密钥）。"
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
            scroll={{ x: 1400 }}
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
            locale={{ emptyText: <Empty description="所选条件下没有同步记录" /> }}
          />
        </Card>
      </div>

      <Drawer
        title={detail ? `同步记录 · ${detail.row.sourceLabel ?? detail.row.source}` : '同步记录详情'}
        width={680}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        extra={
          detail?.row.canRetry && canRetry ? (
            <Button
              size="small"
              icon={<RedoOutlined />}
              onClick={async () => {
                await doRetry(detail.row);
                setDetailOpen(false);
              }}
            >
              重试
            </Button>
          ) : undefined
        }
      >
        {detail && (
          <>
            <Alert type="info" showIcon style={{ marginBottom: 12 }} message={detail.note} />
            <Descriptions
              size="small"
              column={2}
              bordered
              items={[
                { key: 'source', label: '来源', children: detail.row.sourceLabel ?? detail.row.source },
                { key: 'id', label: '记录号', children: detail.row.id },
                { key: 'time', label: '时间', children: formatDateTime(detail.row.time) },
                { key: 'task', label: '任务编码', children: detail.row.taskCode || '-' },
                { key: 'type', label: '类型', children: detail.row.syncType || '-' },
                { key: 'dir', label: '方向', children: detail.row.direction || '-' },
                { key: 'target', label: '目标', children: detail.row.target || '-' },
                { key: 'targetKey', label: '对象键', children: detail.row.targetKey || '-' },
                {
                  key: 'status',
                  label: '状态',
                  children: (
                    <Tag color={statusMeta[detail.row.status]?.color}>
                      {statusMeta[detail.row.status]?.text ?? detail.row.status}
                    </Tag>
                  ),
                },
                { key: 'elapsed', label: '耗时', children: detail.row.elapsed == null ? '-' : `${detail.row.elapsed} ms` },
                { key: 'retry', label: '重试次数', children: detail.row.retryCount ?? 0 },
                { key: 'trace', label: '链路追踪', children: detail.row.traceId || '-' },
                { key: 'message', label: '说明', span: 2, children: detail.row.message || '-' },
              ]}
            />

            <Typography.Title level={5} style={{ marginTop: 16 }}>
              请求摘要
            </Typography.Title>
            <pre
              style={{
                margin: 0,
                padding: 10,
                maxHeight: 200,
                overflow: 'auto',
                background: '#fafafa',
                border: '1px solid #f0f0f0',
                borderRadius: 6,
                fontSize: 12,
                lineHeight: 1.7,
              }}
            >
              {detail.row.requestBody || '—'}
            </pre>

            <Typography.Title level={5} style={{ marginTop: 12 }}>
              响应摘要
            </Typography.Title>
            <pre
              style={{
                margin: 0,
                padding: 10,
                maxHeight: 200,
                overflow: 'auto',
                background: '#f6ffed',
                border: '1px solid #d9f7be',
                borderRadius: 6,
                fontSize: 12,
                lineHeight: 1.7,
              }}
            >
              {detail.row.responseBody || '—'}
            </pre>
          </>
        )}
      </Drawer>
    </div>
  );
}
