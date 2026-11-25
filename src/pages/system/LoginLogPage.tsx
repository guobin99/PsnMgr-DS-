import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Drawer,
  Empty,
  Input,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DownloadOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { usePermission } from '@/hooks/usePermission';
import type { LoginLog, LoginStatistics } from '@/types/systemConfig';
import {
  downloadText,
  exportLoginLogs,
  fetchLoginLogDetail,
  fetchLoginLogs,
  fetchLoginStatistics,
} from '@/services/systemConfig';
import { formatDateTime } from './shared';

const loginTypeMeta: Record<string, { text: string; color: string }> = {
  login: { text: '登录', color: 'blue' },
  logout: { text: '登出', color: 'default' },
  enter: { text: '进入', color: 'cyan' },
  fail: { text: '失败', color: 'red' },
  lock: { text: '锁定', color: 'volcano' },
  revoke: { text: '令牌吊销', color: 'orange' },
};

const resultMeta: Record<number, { text: string; color: string }> = {
  0: { text: '成功', color: 'green' },
  1: { text: '失败', color: 'red' },
};

/** 登录日志：BS_LoginLog 为主，补充 CS 进入/退出；顶部给出今日统计与按小时分布 */
export default function LoginLogPage() {
  const { message } = App.useApp();
  const { has } = usePermission();
  const canExport = has('system:log:login:export');

  const [stats, setStats] = useState<LoginStatistics | null>(null);

  const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>([dayjs().subtract(7, 'day'), dayjs()]);
  const [userNo, setUserNo] = useState('');
  const [userName, setUserName] = useState('');
  const [source, setSource] = useState<string | undefined>();
  const [loginType, setLoginType] = useState<string | undefined>();
  const [result, setResult] = useState<string | undefined>();
  const [ip, setIp] = useState('');

  const [rows, setRows] = useState<LoginLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const baseParams = useMemo(() => {
    const params: Record<string, unknown> = {};
    if (range?.[0]) params.begin = range[0].format('YYYY-MM-DD');
    if (range?.[1]) params.end = range[1].format('YYYY-MM-DD');
    if (userNo.trim()) params.userNo = userNo.trim();
    if (userName.trim()) params.userName = userName.trim();
    if (source) params.source = source;
    if (loginType) params.loginType = loginType;
    if (result !== undefined && result !== '') params.result = Number(result);
    if (ip.trim()) params.ip = ip.trim();
    return params;
  }, [range, userNo, userName, source, loginType, result, ip]);

  const loadStats = useCallback(async () => {
    try {
      setStats(await fetchLoginStatistics());
    } catch {
      setStats(null);
    }
  }, []);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchLoginLogs({ ...baseParams, page, pageSize });
      setRows(data.items);
      setTotal(data.total);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载登录日志失败');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [baseParams, message, page, pageSize]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const maxHourly = useMemo(
    () => Math.max(1, ...(stats?.hourly ?? []).map((item) => item.count)),
    [stats],
  );

  const openDetail = async (row: LoginLog) => {
    try {
      setDetail(await fetchLoginLogDetail(row.id, row.source));
      setDetailOpen(true);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载详情失败');
    }
  };

  const doExport = async () => {
    setExporting(true);
    try {
      const exported = await exportLoginLogs(baseParams);
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

  const columns: ColumnsType<LoginLog> = [
    { title: '时间', dataIndex: 'time', width: 150, render: (value: string) => formatDateTime(value) },
    {
      title: '来源',
      dataIndex: 'source',
      width: 90,
      render: (value: string) => <Tag color={value === 'BS' ? 'purple' : 'blue'}>{value}</Tag>,
    },
    { title: '账号', dataIndex: 'userNo', width: 120, render: (value?: string | null, row?: LoginLog) => value || row?.userName || '-' },
    { title: '姓名', dataIndex: 'userName', width: 100 },
    {
      title: '类型',
      dataIndex: 'loginType',
      width: 110,
      render: (value?: string | null) =>
        value ? <Tag color={loginTypeMeta[value]?.color}>{loginTypeMeta[value]?.text ?? value}</Tag> : '-',
    },
    {
      title: '结果',
      dataIndex: 'result',
      width: 90,
      render: (value: number) => <Tag color={resultMeta[value]?.color}>{resultMeta[value]?.text ?? value}</Tag>,
    },
    {
      title: 'IP',
      dataIndex: 'ip',
      width: 130,
      render: (value?: string | null) =>
        value ? (
          <Tooltip title={(stats?.abnormalIpList ?? []).some((item) => item.ip === value) ? '10 分钟内失败超过 10 次' : ''}>
            <span>{value}</span>
            {(stats?.abnormalIpList ?? []).some((item) => item.ip === value) && (
              <Tag color="red" style={{ marginLeft: 4 }}>
                异常
              </Tag>
            )}
          </Tooltip>
        ) : (
          '-'
        ),
    },
    { title: '客户端', dataIndex: 'userAgent', ellipsis: true },
    {
      title: '重复',
      dataIndex: 'repeatCount',
      width: 80,
      render: (value: number) => (value > 1 ? <Tag color="gold">×{value}</Tag> : <span>-</span>),
    },
    {
      title: '说明',
      dataIndex: 'failReason',
      width: 160,
      ellipsis: true,
      render: (value?: string | null) => value || '-',
    },
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
      <Row gutter={12} style={{ marginBottom: 12 }}>
        <Col span={5}>
          <Card size="small">
            <Statistic title="今日登录成功" value={stats?.todaySuccess ?? 0} valueStyle={{ color: '#3f8600' }} />
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small">
            <Statistic title="今日登录失败" value={stats?.todayFail ?? 0} valueStyle={{ color: '#cf1322' }} />
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small">
            <Statistic title="锁定账号" value={stats?.lockedAccounts ?? 0} valueStyle={{ color: '#d46b08' }} />
          </Card>
        </Col>
        <Col span={9}>
          <Card size="small">
            <Row align="middle" gutter={12}>
              <Col flex="none">
                <Statistic title="异常 IP" value={stats?.abnormalIps ?? 0} valueStyle={{ color: '#cf1322' }} />
              </Col>
              <Col flex="auto">
                <Space size={4} wrap>
                  {(stats?.abnormalIpList ?? []).slice(0, 4).map((item) => (
                    <Tag key={item.ip ?? ''} color="red">
                      {item.ip} · {item.count} 次
                    </Tag>
                  ))}
                  {(stats?.abnormalIpList ?? []).length === 0 && (
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      近 10 分钟无高频失败来源
                    </Typography.Text>
                  )}
                </Space>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      <Card size="small" style={{ marginBottom: 12 }} title="今日登录时段分布" extra={<Button size="small" icon={<ReloadOutlined />} onClick={loadStats}>刷新</Button>}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 90 }}>
          {(stats?.hourly ?? []).map((item) => (
            <Tooltip key={item.hour} title={`${item.hour}:00 · ${item.count} 次`}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div
                  style={{
                    width: '100%',
                    height: Math.max(2, Math.round((item.count / maxHourly) * 68)),
                    background: item.count > 0 ? 'linear-gradient(180deg,#4f7cf7,#8fb0ff)' : '#eef2f8',
                    borderRadius: 3,
                  }}
                />
                {item.hour % 3 === 0 && (
                  <span style={{ fontSize: 10, color: '#98a2b3' }}>{item.hour}</span>
                )}
              </div>
            </Tooltip>
          ))}
        </div>
      </Card>

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
            placeholder="账号"
            value={userNo}
            onChange={(event) => setUserNo(event.target.value)}
          />
          <Input
            allowClear
            style={{ width: 120 }}
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
            style={{ width: 130 }}
            placeholder="类型"
            value={loginType}
            onChange={setLoginType}
            options={[
              { value: 'login', label: '登录' },
              { value: 'logout', label: '登出' },
              { value: 'enter', label: '进入' },
              { value: 'fail', label: '失败' },
              { value: 'lock', label: '锁定' },
              { value: 'revoke', label: '令牌吊销' },
            ]}
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
            style={{ width: 140 }}
            placeholder="IP"
            value={ip}
            onChange={(event) => setIp(event.target.value)}
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
              setUserNo('');
              setUserName('');
              setSource(undefined);
              setLoginType(undefined);
              setResult(undefined);
              setIp('');
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
          message="同一账号、同一分钟、同一来源与类型的记录会合并计数（重复列），便于识别批量尝试。CS 记录只有姓名，没有账号编号与 IP。"
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
          locale={{ emptyText: <Empty description="所选条件下没有登录日志" /> }}
        />
      </Card>

      <Drawer title="登录日志详情" width={520} open={detailOpen} onClose={() => setDetailOpen(false)}>
        {detail && (
          <>
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 12 }}
              message={String(detail.note ?? '')}
            />
            <Descriptions
              size="small"
              column={1}
              bordered
              items={[
                { key: 'source', label: '来源', children: String(detail.source ?? '-') },
                { key: 'time', label: '时间', children: formatDateTime(String(detail.time ?? '')) },
                { key: 'account', label: '账号', children: String(detail.account ?? '-') },
                { key: 'userName', label: '姓名', children: String(detail.userName ?? '-') },
                {
                  key: 'loginType',
                  label: '类型',
                  children:
                    loginTypeMeta[String(detail.loginType ?? '')]?.text ?? String(detail.loginType ?? '-'),
                },
                { key: 'result', label: '结果', children: resultMeta[Number(detail.result ?? 0)]?.text ?? '-' },
                { key: 'failReason', label: '失败原因', children: String(detail.failReason ?? '-') },
                { key: 'ip', label: 'IP', children: String(detail.ip ?? '-') },
                { key: 'userAgent', label: '客户端', children: String(detail.userAgent ?? '-') },
                {
                  key: 'logoutTime',
                  label: '登出时间',
                  children: detail.logoutTime ? formatDateTime(String(detail.logoutTime)) : '-',
                },
                { key: 'sessionId', label: '会话', children: String(detail.sessionId ?? '-') },
              ]}
            />
          </>
        )}
      </Drawer>
    </div>
  );
}
