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
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DownloadOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { usePermission } from '@/hooks/usePermission';
import type { SystemLog } from '@/types/systemConfig';
import {
  downloadText,
  exportSystemLogs,
  fetchSystemLogDetail,
  fetchSystemLogs,
} from '@/services/systemConfig';
import { formatDateTime } from './shared';

const sourceTag: Record<string, { text: string; color: string }> = {
  CS: { text: 'CS 子系统', color: 'blue' },
  BS: { text: 'BS 后台', color: 'purple' },
};

/** 系统日志：CS ST_SysLog 与 BS 系统级事件合并，只读 */
export default function SystemLogPage() {
  const { message } = App.useApp();
  const { has } = usePermission();
  const canExport = has('system:log:system:export');

  const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>([dayjs().subtract(7, 'day'), dayjs()]);
  const [user, setUser] = useState('');
  const [computer, setComputer] = useState('');
  const [systemNo, setSystemNo] = useState<string | undefined>();
  const [source, setSource] = useState<string | undefined>();
  const [keyword, setKeyword] = useState('');

  const [rows, setRows] = useState<SystemLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [detail, setDetail] = useState<{ row: SystemLog; origin: string; note: string } | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const baseParams = useMemo(() => {
    const params: Record<string, unknown> = {};
    if (range?.[0]) params.begin = range[0].format('YYYY-MM-DD');
    if (range?.[1]) params.end = range[1].format('YYYY-MM-DD');
    if (user.trim()) params.user = user.trim();
    if (computer.trim()) params.computer = computer.trim();
    if (systemNo) params.systemNo = systemNo;
    if (source) params.source = source;
    if (keyword.trim()) params.keyword = keyword.trim();
    return params;
  }, [range, user, computer, systemNo, source, keyword]);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchSystemLogs({ ...baseParams, page, pageSize });
      setRows(result.items);
      setTotal(result.total);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载系统日志失败');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [baseParams, message, page, pageSize]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const openDetail = async (row: SystemLog) => {
    try {
      setDetail(await fetchSystemLogDetail(row.id, row.source));
      setDetailOpen(true);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载详情失败');
    }
  };

  const doExport = async () => {
    setExporting(true);
    try {
      const result = await exportSystemLogs(baseParams);
      downloadText(result.fileName, result.content);
      message.success(
        `已导出 ${result.rowCount ?? 0} 行${result.truncated ? '（已达上限，请缩小时间范围）' : ''}`,
      );
    } catch (error) {
      message.error(error instanceof Error ? error.message : '导出失败');
    } finally {
      setExporting(false);
    }
  };

  const columns: ColumnsType<SystemLog> = [
    { title: '时间', dataIndex: 'time', width: 150, render: (value: string) => formatDateTime(value) },
    {
      title: '来源',
      dataIndex: 'source',
      width: 110,
      render: (value: string) => <Tag color={sourceTag[value]?.color}>{sourceTag[value]?.text ?? value}</Tag>,
    },
    { title: '用户', dataIndex: 'userName', width: 120 },
    { title: '机器名', dataIndex: 'computer', width: 150, ellipsis: true },
    { title: '子系统', dataIndex: 'systemNo', width: 90 },
    { title: '事件描述', dataIndex: 'eventDesc', ellipsis: true },
    {
      title: '操作',
      width: 80,
      fixed: 'right',
      render: (_value, row) => (
        <Button size="small" type="link" onClick={() => openDetail(row)}>
          详情
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
            style={{ width: 130 }}
            placeholder="用户"
            value={user}
            onChange={(event) => setUser(event.target.value)}
          />
          <Input
            allowClear
            style={{ width: 140 }}
            placeholder="机器名"
            value={computer}
            onChange={(event) => setComputer(event.target.value)}
          />
          <Select
            allowClear
            style={{ width: 120 }}
            placeholder="子系统"
            value={systemNo}
            onChange={setSystemNo}
            options={['BS', 'CS', 'KQ', 'MJ', 'SF', 'SK', 'FK', 'DC'].map((value) => ({ value, label: value }))}
          />
          <Select
            allowClear
            style={{ width: 130 }}
            placeholder="来源"
            value={source}
            onChange={setSource}
            options={[
              { value: 'CS', label: 'CS 子系统' },
              { value: 'BS', label: 'BS 后台' },
            ]}
          />
          <Input
            allowClear
            style={{ width: 180 }}
            placeholder="事件描述关键词"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
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
              setUser('');
              setComputer('');
              setSystemNo(undefined);
              setSource(undefined);
              setKeyword('');
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
          message="日志只读，BS 不提供删除能力。单次查询时间跨度上限 31 天，默认查询最近 7 天。"
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
          scroll={{ x: 1100 }}
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
          locale={{ emptyText: <Empty description="所选条件下没有系统日志" /> }}
        />
      </Card>

      <Drawer
        title="系统日志详情"
        width={560}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      >
        {detail && (
          <>
            <Alert type="info" showIcon style={{ marginBottom: 12 }} message={detail.note} />
            <Descriptions
              size="small"
              column={1}
              bordered
              items={[
                {
                  key: 'source',
                  label: '来源',
                  children: <Tag color={sourceTag[detail.origin]?.color}>{sourceTag[detail.origin]?.text ?? detail.origin}</Tag>,
                },
                { key: 'id', label: '记录号', children: detail.row.id },
                { key: 'time', label: '时间', children: formatDateTime(detail.row.time) },
                { key: 'user', label: '用户', children: detail.row.userName || '-' },
                { key: 'computer', label: '机器名', children: detail.row.computer || '-' },
                { key: 'systemNo', label: '子系统', children: detail.row.systemNo || '-' },
                { key: 'event', label: '事件描述', children: detail.row.eventDesc || '-' },
                { key: 'module', label: '模块', children: detail.row.module || '-' },
                { key: 'trace', label: '链路追踪', children: detail.row.traceId || '-' },
              ]}
            />
          </>
        )}
      </Drawer>
    </div>
  );
}
