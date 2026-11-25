import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  DatePicker,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  Select,
  Space,
  Statistic,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ClearOutlined, DatabaseOutlined, ReloadOutlined, ToolOutlined, UploadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { usePermission } from '@/hooks/usePermission';
import type {
  CleanupPreview,
  FragmentationItem,
  MaintJob,
  MaintModeInfo,
  MaintStep,
  SyncTask,
} from '@/types/systemConfig';
import {
  createBackup,
  createTransfer,
  fetchBackups,
  fetchCleanupPreview,
  fetchFragmentation,
  fetchMaintJob,
  fetchMaintMode,
  fetchSyncTasks,
  rebuildIndexes,
  runCleanup,
  runSettle,
  setMaintMode,
  updateStatistics,
} from '@/services/systemConfig';
import { formatDateTime } from './shared';

const jobStatusMeta: Record<number, { text: string; color: string }> = {
  0: { text: '待执行', color: 'default' },
  1: { text: '执行中', color: 'processing' },
  2: { text: '成功', color: 'success' },
  3: { text: '失败', color: 'red' },
  4: { text: '已取消', color: 'default' },
};

/** 数据维护：备份、整理、清理与结算、上传下载 */
export default function MaintainPage() {
  const { message, modal } = App.useApp();
  const { has } = usePermission();
  const canBackup = has('system:maintain:backup');
  const canRebuild = has('system:maintain:rebuild');
  const canCleanup = has('system:maintain:cleanup');
  const canExecute = has('system:maintain:execute');

  const [mode, setMode] = useState<MaintModeInfo | null>(null);
  const [modeLoading, setModeLoading] = useState(false);

  /* 备份 */
  const [backupForm] = Form.useForm();
  const [backups, setBackups] = useState<MaintJob[]>([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupRunning, setBackupRunning] = useState(false);

  /* 整理 */
  const [frags, setFrags] = useState<FragmentationItem[]>([]);
  const [fragLoading, setFragLoading] = useState(false);
  const [selectedFrags, setSelectedFrags] = useState<string[]>([]);
  const [tableFilter, setTableFilter] = useState('');
  const [onlyFragmented, setOnlyFragmented] = useState(false);
  const filterRef = useRef('');
  const filterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* 清理 */
  const [cutoff, setCutoff] = useState<dayjs.Dayjs | null>(dayjs().subtract(1, 'year'));
  const [preview, setPreview] = useState<CleanupPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [backupDone, setBackupDone] = useState(false);
  const [csExited, setCsExited] = useState(false);
  const [ackIrreversible, setAckIrreversible] = useState(false);
  const [cleanupRunning, setCleanupRunning] = useState(false);

  /* 上传下载 */
  const [tasks, setTasks] = useState<SyncTask[]>([]);
  const [transferForm] = Form.useForm();

  /* 作业详情 */
  const [jobDetail, setJobDetail] = useState<{ job: MaintJob; steps: MaintStep[] } | null>(null);
  const [jobOpen, setJobOpen] = useState(false);

  const loadMode = useCallback(async () => {
    try {
      setMode(await fetchMaintMode());
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载维护模式失败');
    }
  }, [message]);

  const loadBackups = useCallback(async () => {
    setBackupLoading(true);
    try {
      const result = await fetchBackups(1, 20);
      setBackups(result.items);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载备份历史失败');
    } finally {
      setBackupLoading(false);
    }
  }, [message]);

  const loadFrags = useCallback(async (keyword?: string) => {
    setFragLoading(true);
    try {
      const value = (keyword ?? filterRef.current).trim();
      const rows = await fetchFragmentation(value || undefined);
      setFrags(rows);
      setSelectedFrags([]); // 筛选条件变化后，旧勾选不再对应当前结果
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载碎片率失败');
    } finally {
      setFragLoading(false);
    }
  }, [message]);

  // 输入即筛选（300ms 防抖），回车或点搜索按钮立即刷新
  const changeFilter = (value: string) => {
    setTableFilter(value);
    filterRef.current = value;
    if (filterTimer.current) clearTimeout(filterTimer.current);
    filterTimer.current = setTimeout(() => { void loadFrags(value); }, 300);
  };
  const searchFilter = (value: string) => {
    if (filterTimer.current) clearTimeout(filterTimer.current);
    setTableFilter(value);
    filterRef.current = value;
    void loadFrags(value);
  };

  useEffect(() => () => {
    if (filterTimer.current) clearTimeout(filterTimer.current);
  }, []);

  const visibleFrags = useMemo(
    () => (onlyFragmented ? frags.filter((item) => item.avgFragmentation > 30) : frags),
    [frags, onlyFragmented],
  );
  const tableCount = useMemo(() => new Set(frags.map((item) => item.tableName)).size, [frags]);

  const loadTasks = useCallback(async () => {
    try {
      setTasks(await fetchSyncTasks());
    } catch {
      setTasks([]);
    }
  }, []);

  useEffect(() => {
    loadMode();
    loadBackups();
    loadTasks();
  }, [loadMode, loadBackups, loadTasks]);

  const toggleMode = async (enabled: boolean) => {
    setModeLoading(true);
    try {
      const result = await setMaintMode(enabled, 2);
      message.success(enabled ? `维护模式已开启，将于 ${result.until ?? '两小时后'} 自动关闭` : '维护模式已关闭');
      await loadMode();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '操作失败');
    } finally {
      setModeLoading(false);
    }
  };

  const doBackup = async () => {
    const values = await backupForm.validateFields();
    setBackupRunning(true);
    try {
      const result = await createBackup(values);
      message.success(`备份完成：${result.path}`);
      await loadBackups();
      await loadMode();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '备份失败');
    } finally {
      setBackupRunning(false);
    }
  };

  const openJob = async (jobId: number) => {
    try {
      setJobDetail(await fetchMaintJob(jobId));
      setJobOpen(true);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载作业详情失败');
    }
  };

  const loadPreview = async () => {
    if (!cutoff) {
      message.warning('请选择截止日期');
      return;
    }
    setPreviewLoading(true);
    try {
      const result = await fetchCleanupPreview(cutoff.format('YYYY-MM-DD'));
      setPreview(result);
      setPhrase('');
      setBackupDone(false);
      setCsExited(false);
      setAckIrreversible(false);
      await loadMode();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '预演失败');
    } finally {
      setPreviewLoading(false);
    }
  };

  const submitCleanup = () => {
    if (!cutoff || !preview) return;
    modal.confirm({
      title: '执行数据清理',
      width: 560,
      content: (
        <div style={{ lineHeight: 1.9 }}>
          <div>截止日期：{preview.cutoffDate}</div>
          <div>待结转行数：{preview.totalRows}</div>
          <div style={{ color: '#cf1322' }}>该操作不可逆，执行前请确认已完成数据库备份。</div>
        </div>
      ),
      okText: '确认执行',
      okButtonProps: { danger: true },
      onOk: async () => {
        setCleanupRunning(true);
        try {
          const result = await runCleanup({
            CutoffDate: preview.cutoffDate,
            ConfirmPhrase: phrase.trim(),
            BackupDone: backupDone,
            CsExited: csExited,
            Irreversible: ackIrreversible,
          });
          message.success('清理已提交执行');
          await loadBackups();
          await loadMode();
          setPreview(null);
          openJob(result.jobId);
        } catch (error) {
          message.error(error instanceof Error ? error.message : '清理失败');
        } finally {
          setCleanupRunning(false);
        }
      },
    });
  };

  const backupColumns: ColumnsType<MaintJob> = [
    { title: '编号', dataIndex: 'jobId', width: 70 },
    { title: '名称', dataIndex: 'jobName', ellipsis: true },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (value: number) => <Tag color={jobStatusMeta[value]?.color}>{jobStatusMeta[value]?.text ?? value}</Tag>,
    },
    { title: '结果', dataIndex: 'message', ellipsis: true },
    { title: '操作人', dataIndex: 'createUser', width: 100 },
    { title: '时间', dataIndex: 'createTime', width: 150, render: (value: string) => formatDateTime(value) },
    {
      title: '操作',
      width: 80,
      render: (_value, row) => (
        <Button size="small" type="link" onClick={() => openJob(row.jobId)}>
          日志
        </Button>
      ),
    },
  ];

  const fragColumns: ColumnsType<FragmentationItem> = [
    { title: '表', dataIndex: 'tableName', width: 200 },
    { title: '索引', dataIndex: 'indexName', width: 220 },
    {
      title: '碎片率',
      dataIndex: 'avgFragmentation',
      width: 110,
      sorter: (a, b) => a.avgFragmentation - b.avgFragmentation,
      render: (value: number) => (
        <Tag color={value > 50 ? 'red' : value > 30 ? 'orange' : 'green'}>{value.toFixed(1)}%</Tag>
      ),
    },
    {
      title: '页数',
      dataIndex: 'pageCount',
      width: 110,
      sorter: (a, b) => a.pageCount - b.pageCount,
      render: (value: number) => value.toLocaleString(),
    },
  ];

  const cleanupReady =
    Boolean(preview) &&
    phrase.trim() === (preview?.confirmPhrase ?? '__') &&
    backupDone &&
    csExited &&
    ackIrreversible &&
    Boolean(preview?.maintenanceMode);

  return (
    <div className="system-workspace system-page-single">
      <Card size="small" style={{ marginBottom: 12 }}>
        <Space size={16} wrap>
          <Space>
            <Typography.Text strong>维护模式</Typography.Text>
            <Switch
              checked={Boolean(mode?.enabled)}
              loading={modeLoading}
              disabled={!canExecute}
              onChange={toggleMode}
            />
            {mode?.enabled ? <Tag color="orange">已开启至 {mode.until ?? '-'}</Tag> : <Tag>未开启</Tag>}
          </Space>
          {mode?.sessionBlocked && (
            <Typography.Text type="danger">检测到 {mode.activeSessions} 个 CS 活跃会话，请先让其退出</Typography.Text>
          )}
          {mode && mode.runningJobs > 0 && <Tag color="processing">运行中作业 {mode.runningJobs} 个</Tag>}
          <Button size="small" icon={<ReloadOutlined />} onClick={loadMode}>
            刷新状态
          </Button>
        </Space>
      </Card>

      <Card size="small">
        <Tabs
          items={[
            {
              key: 'backup',
              label: '备份',
              children: (
                <div>
                  <Form form={backupForm} layout="inline" initialValues={{ BackupType: 'full', Compression: true, Verify: true }}>
                    <Form.Item name="BackupType" label="类型">
                      <Select
                        style={{ width: 110 }}
                        options={[
                          { value: 'full', label: '完整备份' },
                          { value: 'diff', label: '差异备份' },
                        ]}
                      />
                    </Form.Item>
                    <Form.Item name="TargetPath" label="目标路径">
                      <Input style={{ width: 320 }} placeholder="留空则写入白名单首个目录" />
                    </Form.Item>
                    <Form.Item name="Compression" label="压缩" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                    <Form.Item name="Verify" label="校验" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                    <Form.Item>
                      <Button
                        type="primary"
                        icon={<DatabaseOutlined />}
                        loading={backupRunning}
                        disabled={!canBackup}
                        onClick={doBackup}
                      >
                        执行备份
                      </Button>
                    </Form.Item>
                  </Form>
                  <Alert
                    type="info"
                    showIcon
                    style={{ margin: '12px 0' }}
                    message="备份通过 BACKUP DATABASE 执行，路径必须位于系统参数 Backup.Path.Whitelist 白名单内。恢复动作默认不开放，需由 DBA 在数据库端执行。"
                  />
                  <Table
                    rowKey="jobId"
                    size="small"
                    loading={backupLoading}
                    dataSource={backups}
                    columns={backupColumns}
                    pagination={false}
                    locale={{ emptyText: <Empty description="暂无备份记录" /> }}
                  />
                </div>
              ),
            },
            {
              key: 'rebuild',
              label: '整理',
              children: (
                <div>
                  <div className="system-toolbar">
                    <Space>
                      <Input.Search
                        allowClear
                        placeholder="按表名筛选（支持模糊）"
                        style={{ width: 240 }}
                        value={tableFilter}
                        onChange={(event) => changeFilter(event.target.value)}
                        onSearch={searchFilter}
                      />
                      <Button icon={<ReloadOutlined />} loading={fragLoading} onClick={() => loadFrags()}>
                        加载碎片率
                      </Button>
                      <Checkbox checked={onlyFragmented} onChange={(event) => setOnlyFragmented(event.target.checked)}>
                        仅看碎片率 &gt; 30%
                      </Checkbox>
                    </Space>
                    <Space>
                      <Button
                        icon={<ToolOutlined />}
                        disabled={!canRebuild || selectedFrags.length === 0}
                        onClick={async () => {
                          const items = selectedFrags.map((key) => {
                            const [tableName, indexName] = key.split('|');
                            return { TableName: tableName, IndexName: indexName };
                          });
                          try {
                            const result = await rebuildIndexes(items);
                            message.success(`成功 ${result.succeeded} 项，失败 ${result.failed} 项`);
                            await loadFrags();
                            openJob(result.jobId);
                          } catch (error) {
                            message.error(error instanceof Error ? error.message : '重建失败');
                          }
                        }}
                      >
                        重建选中索引
                      </Button>
                      <Button
                        disabled={!canRebuild || frags.length === 0}
                        onClick={async () => {
                          const tables = Array.from(new Set(frags.map((item) => item.tableName)));
                          try {
                            const result = await updateStatistics(tables);
                            message.success(`已更新 ${result.succeeded} 张表的统计信息`);
                            openJob(result.jobId);
                          } catch (error) {
                            message.error(error instanceof Error ? error.message : '更新失败');
                          }
                        }}
                      >
                        更新统计信息
                      </Button>
                    </Space>
                  </div>
                  <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                    共 {frags.length} 个索引 / {tableCount} 张表
                    {onlyFragmented ? `，需整理 ${visibleFrags.length} 项` : ''}
                    （无索引的堆表不在列表内）
                  </Typography.Text>
                  <Table
                    key={tableFilter || 'all'}
                    rowKey={(row) => `${row.tableName}|${row.indexName}`}
                    size="small"
                    loading={fragLoading}
                    dataSource={visibleFrags}
                    columns={fragColumns}
                    pagination={{ pageSize: 20 }}
                    rowSelection={{
                      selectedRowKeys: selectedFrags,
                      onChange: (keys) => setSelectedFrags(keys as string[]),
                    }}
                    locale={{ emptyText: <Empty description="点击“加载碎片率”查看索引碎片情况" /> }}
                  />
                </div>
              ),
            },
            {
              key: 'cleanup',
              label: '清理与结算',
              children: (
                <div>
                  <Space wrap style={{ marginBottom: 12 }}>
                    <DatePicker
                      value={cutoff}
                      onChange={(value) => setCutoff(value)}
                      placeholder="清理截止日期"
                    />
                    <Button type="primary" loading={previewLoading} onClick={loadPreview}>
                      预演统计
                    </Button>
                    <Typography.Text type="secondary">预演只统计不写库，单次统计七张清理表</Typography.Text>
                  </Space>

                  {!preview ? (
                    <Empty description="请选择截止日期后执行预演" />
                  ) : (
                    <div>
                      <Space size={24} style={{ marginBottom: 12 }} wrap>
                        <Statistic title="待结转行数" value={preview.totalRows} />
                        <Statistic title="受影响人数" value={preview.affectedPersons} />
                        <Statistic title="CS 活跃会话" value={preview.activeSessions} />
                        <Statistic
                          title="维护模式"
                          value={preview.maintenanceMode ? '已开启' : '未开启'}
                          valueStyle={{ color: preview.maintenanceMode ? '#3f8600' : '#cf1322' }}
                        />
                      </Space>

                      <Table
                        rowKey="tableName"
                        size="small"
                        dataSource={preview.tables}
                        pagination={false}
                        columns={[
                          { title: '表', dataIndex: 'tableName', width: 200 },
                          { title: '日期字段', dataIndex: 'dateField', width: 160 },
                          { title: '待结转行数', dataIndex: 'rows', width: 130 },
                          { title: 'History 表', dataIndex: 'historyTable', width: 220 },
                          {
                            title: '历史表',
                            dataIndex: 'historyExists',
                            width: 100,
                            render: (value: boolean) => (value ? <Tag color="green">存在</Tag> : <Tag color="red">缺失</Tag>),
                          },
                        ]}
                      />

                      <Card size="small" title="执行确认" style={{ marginTop: 12 }}>
                        <Space direction="vertical" style={{ width: '100%' }}>
                          {!preview.maintenanceMode && (
                            <Alert type="warning" showIcon message="请先开启维护模式，否则执行会被拒绝（40904）" />
                          )}
                          <Input
                            value={phrase}
                            onChange={(event) => setPhrase(event.target.value)}
                            placeholder={`请输入确认短语：${preview.confirmPhrase}`}
                          />
                          <Space direction="vertical">
                            <Checkbox checked={backupDone} onChange={(event) => setBackupDone(event.target.checked)}>
                              已完成数据库备份
                            </Checkbox>
                            <Checkbox checked={csExited} onChange={(event) => setCsExited(event.target.checked)}>
                              CS 端已全部退出
                            </Checkbox>
                            <Checkbox checked={ackIrreversible} onChange={(event) => setAckIrreversible(event.target.checked)}>
                              知晓该操作不可逆
                            </Checkbox>
                          </Space>
                          <Space>
                            <Button
                              danger
                              type="primary"
                              icon={<ClearOutlined />}
                              disabled={!canCleanup || !cleanupReady}
                              loading={cleanupRunning}
                              onClick={submitCleanup}
                            >
                              执行清理
                            </Button>
                            <Button
                              disabled={!canExecute || !preview.maintenanceMode || !backupDone}
                              onClick={() =>
                                modal.confirm({
                                  title: '创建结算任务',
                                  content: '结算计算口径复用 CS uFinancialSettle，任务创建后需在 CS 结算程序执行。',
                                  okText: '创建',
                                  onOk: async () => {
                                    try {
                                      const result = await runSettle({
                                        CutoffDate: preview.cutoffDate,
                                        BackupDone: backupDone,
                                        CsExited: csExited,
                                      });
                                      message.success('结算任务已创建');
                                      openJob(result.jobId);
                                    } catch (error) {
                                      message.error(error instanceof Error ? error.message : '创建失败');
                                    }
                                  },
                                })
                              }
                            >
                              创建结算任务
                            </Button>
                          </Space>
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            执行顺序：财务结算 → 按 Delete_Index 顺序把当前表记录写入 History 表 → 删除当前表记录 → 写审计。
                          </Typography.Text>
                        </Space>
                      </Card>
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: 'transfer',
              label: '上传下载',
              children: (
                <div>
                  <Form
                    form={transferForm}
                    layout="inline"
                    initialValues={{ Direction: 'down' }}
                    onFinish={async (values) => {
                      try {
                        const result = await createTransfer({
                          TaskCode: values.TaskCode,
                          Direction: values.Direction,
                          Target: values.Target,
                          TargetKey: values.TargetKey,
                        });
                        message.success('任务已提交');
                        openJob(result.jobId);
                      } catch (error) {
                        message.error(error instanceof Error ? error.message : '提交失败');
                      }
                    }}
                  >
                    <Form.Item name="TaskCode" label="任务" rules={[{ required: true, message: '请选择任务' }]}>
                      <Select
                        style={{ width: 240 }}
                        options={tasks.map((task) => ({ value: task.taskCode, label: `${task.taskName}（${task.taskCode}）` }))}
                      />
                    </Form.Item>
                    <Form.Item name="Direction" label="方向">
                      <Select
                        style={{ width: 110 }}
                        options={[
                          { value: 'down', label: '下发' },
                          { value: 'up', label: '上传' },
                        ]}
                      />
                    </Form.Item>
                    <Form.Item name="Target" label="目标">
                      <Input style={{ width: 180 }} placeholder="机台号或对象" />
                    </Form.Item>
                    <Form.Item name="TargetKey" label="目标主键">
                      <Input style={{ width: 160 }} placeholder="人员或单号" />
                    </Form.Item>
                    <Form.Item>
                      <Button type="primary" htmlType="submit" icon={<UploadOutlined />} disabled={!canExecute}>
                        提交任务
                      </Button>
                    </Form.Item>
                  </Form>
                  <Table
                    rowKey="taskCode"
                    size="small"
                    style={{ marginTop: 12 }}
                    dataSource={tasks}
                    pagination={false}
                    columns={[
                      { title: '任务编码', dataIndex: 'taskCode', width: 180 },
                      { title: '名称', dataIndex: 'taskName', width: 160 },
                      { title: '方向', dataIndex: 'direction', width: 90 },
                      { title: '类型', dataIndex: 'taskType', width: 110 },
                      { title: '批次', dataIndex: 'batchSize', width: 90 },
                      { title: '最近运行', dataIndex: 'lastRunTime', width: 150, render: (value?: string | null) => formatDateTime(value) },
                      { title: '最近结果', dataIndex: 'lastMessage', ellipsis: true },
                    ]}
                  />
                </div>
              ),
            },
          ]}
        />
      </Card>

      <Drawer
        title={jobDetail ? `作业 ${jobDetail.job.jobId}：${jobDetail.job.jobName}` : '作业详情'}
        width={640}
        open={jobOpen}
        onClose={() => setJobOpen(false)}
      >
        {jobDetail && (
          <>
            <Descriptions
              size="small"
              column={2}
              items={[
                { key: 'type', label: '类型', children: jobDetail.job.jobType },
                {
                  key: 'status',
                  label: '状态',
                  children: (
                    <Tag color={jobStatusMeta[jobDetail.job.status]?.color}>
                      {jobStatusMeta[jobDetail.job.status]?.text ?? jobDetail.job.status}
                    </Tag>
                  ),
                },
                { key: 'progress', label: '进度', children: `${jobDetail.job.progress}%` },
                { key: 'user', label: '操作人', children: jobDetail.job.createUser || '-' },
                { key: 'start', label: '开始', children: formatDateTime(jobDetail.job.startTime) },
                { key: 'finish', label: '结束', children: formatDateTime(jobDetail.job.finishTime) },
                { key: 'msg', label: '结果', children: jobDetail.job.message || '-', span: 2 },
              ]}
            />
            <Table
              rowKey="idKey"
              size="small"
              style={{ marginTop: 12 }}
              dataSource={jobDetail.steps}
              pagination={false}
              columns={[
                { title: '时间', dataIndex: 'logTime', width: 150, render: (value: string) => formatDateTime(value) },
                { title: '步骤', dataIndex: 'step', width: 160 },
                { title: '说明', dataIndex: 'message', ellipsis: true },
                { title: '影响行数', dataIndex: 'affected', width: 100 },
              ]}
              locale={{ emptyText: <Empty description="暂无步骤日志" /> }}
            />
          </>
        )}
      </Drawer>
    </div>
  );
}
