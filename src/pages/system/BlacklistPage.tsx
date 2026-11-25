import { useCallback, useEffect, useMemo, useState } from 'react';
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
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DownloadOutlined, ImportOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { usePermission } from '@/hooks/usePermission';
import type { BlacklistItem, CardLookup } from '@/types/systemConfig';
import {
  addBlacklist,
  exportBlacklist,
  fetchBlacklist,
  fetchBlacklistItem,
  importBlacklist,
  lookupCard,
  releaseBlacklist,
} from '@/services/systemConfig';
import { fetchDepartmentTree } from '@/services/system';
import type { DepartmentTreeNode } from '@/types/system';
import { DepartmentTreePanel, formatDateTime } from './shared';

const sourceMeta: Record<string, { text: string; color: string }> = {
  manual: { text: '人工加入', color: 'blue' },
  cs: { text: 'CS 写入', color: 'default' },
  system: { text: '系统自动', color: 'purple' },
};

const cardStateMeta: Record<string, { text: string; color: string }> = {
  '0': { text: '正常', color: 'green' },
  '9': { text: '黑名单', color: 'red' },
};

/** 黑名单管理：人员卡挂失/禁用名单，支持加入、批量导入、释放与导出 */
export default function BlacklistPage() {
  const { message, modal } = App.useApp();
  const { has } = usePermission();
  const canCreate = has('system:blacklist:create');
  const canDelete = has('system:blacklist:delete');
  const canExport = has('system:blacklist:export');

  const [depts, setDepts] = useState<DepartmentTreeNode[]>([]);
  const [deptLoading, setDeptLoading] = useState(false);
  const [deptId, setDeptId] = useState<number | undefined>();

  const [rows, setRows] = useState<BlacklistItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);

  const [cardNo, setCardNo] = useState('');
  const [personNo, setPersonNo] = useState('');
  const [personName, setPersonName] = useState('');
  const [range, setRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [source, setSource] = useState<string | undefined>();
  const [releaseFilter, setReleaseFilter] = useState<string | undefined>();

  /* 加入黑名单 */
  const [addOpen, setAddOpen] = useState(false);
  const [addForm] = Form.useForm();
  const [lookup, setLookup] = useState<CardLookup | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [addSaving, setAddSaving] = useState(false);

  /* 批量导入 */
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importSaving, setImportSaving] = useState(false);

  /* 详情 */
  const [detail, setDetail] = useState<BlacklistItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const query = useMemo(() => {
    const params: Record<string, unknown> = { page, pageSize };
    if (cardNo.trim()) params.cardNo = cardNo.trim();
    if (personNo.trim()) params.personNo = personNo.trim();
    if (personName.trim()) params.personName = personName.trim();
    if (deptId) params.deptId = deptId;
    if (range?.[0]) params.begin = range[0].format('YYYY-MM-DD');
    if (range?.[1]) params.end = range[1].format('YYYY-MM-DD');
    if (source) params.source = source;
    if (releaseFilter) params.releaseable = releaseFilter === '1';
    return params;
  }, [cardNo, personNo, personName, deptId, range, source, releaseFilter, page, pageSize]);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchBlacklist(query);
      setRows(result.items);
      setTotal(result.total);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载黑名单失败');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [message, query]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    setDeptLoading(true);
    fetchDepartmentTree(false, 'active')
      .then(setDepts)
      .catch(() => setDepts([]))
      .finally(() => setDeptLoading(false));
  }, []);

  const resetQuery = () => {
    setCardNo('');
    setPersonNo('');
    setPersonName('');
    setRange(null);
    setSource(undefined);
    setReleaseFilter(undefined);
    setDeptId(undefined);
    setPage(1);
  };

  const closeAdd = () => {
    setAddOpen(false);
    setLookup(null);
    addForm.resetFields();
  };

  const doLookup = async () => {
    const value = String(addForm.getFieldValue('Card_No') ?? '').trim();
    if (!value) {
      message.warning('请先输入卡号');
      return;
    }
    setLookupLoading(true);
    try {
      setLookup(await lookupCard(value));
    } catch (error) {
      message.error(error instanceof Error ? error.message : '查询卡号失败');
    } finally {
      setLookupLoading(false);
    }
  };

  const submitAdd = async () => {
    const values = await addForm.validateFields();
    setAddSaving(true);
    try {
      const result = await addBlacklist({
        Card_No: String(values.Card_No).trim(),
        Reason: values.Reason,
        Del_Sign: Boolean(values.Del_Sign),
        SyncNow: Boolean(values.SyncNow),
      });
      message.success(
        `已加入黑名单${result.cardState === '9' ? '，卡状态已置为黑名单' : ''}${
          result.syncTaskCreated ? '，已创建设备名单下发任务' : ''
        }`,
      );
      closeAdd();
      await loadRows();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加入失败');
    } finally {
      setAddSaving(false);
    }
  };

  const submitImport = async () => {
    const items = importText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [no, ...rest] = line.split(/[,\t，]/);
        return { cardNo: (no ?? '').trim(), reason: rest.join(' ').trim() || undefined };
      })
      .filter((item) => item.cardNo);

    if (items.length === 0) {
      message.warning('请粘贴卡号列表，每行一条');
      return;
    }
    setImportSaving(true);
    try {
      const result = await importBlacklist(items);
      if (result.errors.length > 0) {
        modal.info({
          title: `成功 ${result.added} 条，跳过 ${result.skipped} 条`,
          width: 520,
          content: (
            <div style={{ maxHeight: 320, overflow: 'auto', lineHeight: 1.9 }}>
              {result.errors.map((text) => (
                <div key={text}>{text}</div>
              ))}
            </div>
          ),
        });
      } else {
        message.success(`成功加入 ${result.added} 条，跳过 ${result.skipped} 条`);
      }
      setImportOpen(false);
      setImportText('');
      await loadRows();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '导入失败');
    } finally {
      setImportSaving(false);
    }
  };

  const openRelease = (row: BlacklistItem) => {
    let reason = '';
    modal.confirm({
      title: `释放黑名单：${row.cardNo ?? '-'}`,
      width: 520,
      content: (
        <div style={{ lineHeight: 1.9 }}>
          <div>
            人员：{row.personName ?? '-'}（{row.personNo ?? '-'}）
          </div>
          <div>加入时间：{formatDateTime(row.delDate)}</div>
          <div>来源：{sourceMeta[row.source]?.text ?? row.source}</div>
          {!row.releaseable && (
            <Alert
              type="warning"
              showIcon
              style={{ margin: '8px 0' }}
              message={`保留期未到，${row.releaseableTime ? `可于 ${formatDateTime(row.releaseableTime)} 后释放` : '暂不可释放'}`}
            />
          )}
          <Input.TextArea
            rows={3}
            placeholder="请填写释放原因（必填，写入操作审计）"
            onChange={(event) => {
              reason = event.target.value;
            }}
          />
        </div>
      ),
      okText: '确认释放',
      okButtonProps: { danger: true, disabled: !row.releaseable },
      onOk: async () => {
        if (!reason.trim()) {
          message.error('请填写释放原因');
          throw new Error('reason required');
        }
        try {
          const result = await releaseBlacklist(row.id, reason.trim());
          message.success(`已释放${result.cardState === '0' ? '，卡状态恢复为正常' : ''}`);
          await loadRows();
        } catch (error) {
          message.error(error instanceof Error ? error.message : '释放失败');
          throw error;
        }
      },
    });
  };

  const openDetail = async (row: BlacklistItem) => {
    try {
      setDetail(await fetchBlacklistItem(row.id));
      setDetailOpen(true);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载详情失败');
    }
  };

  const doExport = async () => {
    try {
      const result = await exportBlacklist({
        cardNo: cardNo.trim() || undefined,
        personName: personName.trim() || undefined,
      });
      const { downloadText } = await import('@/services/systemConfig');
      downloadText(result.fileName, result.content);
      message.success(`已导出 ${result.itemCount ?? 0} 条记录`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '导出失败');
    }
  };

  const columns: ColumnsType<BlacklistItem> = [
    { title: '卡号', dataIndex: 'cardNo', width: 140 },
    { title: '人员编号', dataIndex: 'personNo', width: 110 },
    { title: '姓名', dataIndex: 'personName', width: 100 },
    { title: '部门', dataIndex: 'deptName', width: 160, ellipsis: true },
    { title: '加入时间', dataIndex: 'delDate', width: 150, render: (value?: string | null) => formatDateTime(value) },
    {
      title: '来源',
      dataIndex: 'source',
      width: 100,
      render: (value: string) => <Tag color={sourceMeta[value]?.color}>{sourceMeta[value]?.text ?? value}</Tag>,
    },
    { title: '原因', dataIndex: 'remark', ellipsis: true },
    {
      title: '卡状态',
      dataIndex: 'cardState',
      width: 100,
      render: (value?: string | null) =>
        value ? (
          <Tag color={cardStateMeta[value]?.color}>{cardStateMeta[value]?.text ?? value}</Tag>
        ) : (
          <Typography.Text type="secondary">无卡</Typography.Text>
        ),
    },
    {
      title: '可释放时间',
      dataIndex: 'releaseableTime',
      width: 130,
      render: (value: string | null | undefined, row) => (
        <Space size={4}>
          <span>{value ? dayjs(value).format('YYYY-MM-DD') : '-'}</span>
          {row.releaseable ? <Tag color="green">可释放</Tag> : <Tag>保留中</Tag>}
        </Space>
      ),
    },
    {
      title: '操作',
      width: 140,
      fixed: 'right',
      render: (_value, row) => (
        <Space size={0}>
          <Button size="small" type="link" onClick={() => openDetail(row)}>
            详情
          </Button>
          <Tooltip title={row.releaseable ? '' : '保留期未到，暂不可释放'}>
            <Button
              size="small"
              type="link"
              danger
              disabled={!canDelete || !row.releaseable}
              onClick={() => openRelease(row)}
            >
              释放
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="system-page system-workspace">
      <Card size="small" className="system-context-card" title="部门">
        <DepartmentTreePanel
          nodes={depts}
          loading={deptLoading}
          countMode="active"
          selectedKey={deptId}
          onSelect={(keys) => {
            setDeptId(keys.length > 0 ? Number(keys[0]) : undefined);
            setPage(1);
          }}
        />
        <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
          选中部门时按其 Dept_No 前缀包含下级部门。
        </Typography.Text>
      </Card>

      <div>
        <Card size="small" className="filter-card">
          <Space wrap size={10}>
            <Input
              allowClear
              style={{ width: 150 }}
              placeholder="卡号"
              value={cardNo}
              onChange={(event) => setCardNo(event.target.value)}
            />
            <Input
              allowClear
              style={{ width: 130 }}
              placeholder="人员编号"
              value={personNo}
              onChange={(event) => setPersonNo(event.target.value)}
            />
            <Input
              allowClear
              style={{ width: 130 }}
              placeholder="姓名"
              value={personName}
              onChange={(event) => setPersonName(event.target.value)}
            />
            <DatePicker.RangePicker
              value={range as never}
              onChange={(values) => setRange(values as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null)}
              placeholder={['加入起始', '加入截止']}
            />
            <Select
              allowClear
              style={{ width: 130 }}
              placeholder="来源"
              value={source}
              onChange={(value) => {
                setSource(value);
                setPage(1);
              }}
              options={[
                { value: 'manual', label: '人工加入' },
                { value: 'cs', label: 'CS 写入' },
                { value: 'system', label: '系统自动' },
              ]}
            />
            <Select
              allowClear
              style={{ width: 130 }}
              placeholder="释放状态"
              value={releaseFilter}
              onChange={(value) => {
                setReleaseFilter(value);
                setPage(1);
              }}
              options={[
                { value: '1', label: '可释放' },
                { value: '0', label: '保留中' },
              ]}
            />
            <Button icon={<SearchOutlined />} onClick={() => setPage(1)}>
              查询
            </Button>
            <Button icon={<ReloadOutlined />} onClick={resetQuery}>
              重置
            </Button>
          </Space>
        </Card>

        <Card size="small">
          <div className="system-toolbar">
            <Space>
              <Button type="primary" icon={<PlusOutlined />} disabled={!canCreate} onClick={() => setAddOpen(true)}>
                加入黑名单
              </Button>
              <Button icon={<ImportOutlined />} disabled={!canCreate} onClick={() => setImportOpen(true)}>
                批量导入
              </Button>
              <Button icon={<DownloadOutlined />} disabled={!canExport} onClick={doExport}>
                导出
              </Button>
            </Space>
            <Typography.Text type="secondary">共 {total} 条记录</Typography.Text>
          </div>

          <Table
            rowKey="id"
            size="small"
            loading={loading}
            dataSource={rows}
            columns={columns}
            scroll={{ x: 1300 }}
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
            locale={{ emptyText: <Empty description="暂无黑名单记录" /> }}
          />
        </Card>
      </div>

      <Modal
        title="加入黑名单"
        open={addOpen}
        onCancel={closeAdd}
        onOk={submitAdd}
        confirmLoading={addSaving}
        okText="确认加入"
        width={560}
        destroyOnClose
      >
        <Form form={addForm} layout="vertical" preserve={false} initialValues={{ Del_Sign: false, SyncNow: false }}>
          <Form.Item
            name="Card_No"
            label="卡号"
            rules={[
              { required: true, message: '请输入卡号' },
              { max: 12, message: '卡号长度不得超过 12 位' },
            ]}
          >
            <Input
              placeholder="输入卡号后可先查询人员信息"
              maxLength={12}
              addonAfter={
                <Button type="link" size="small" loading={lookupLoading} onClick={doLookup} style={{ padding: 0 }}>
                  查询
                </Button>
              }
            />
          </Form.Item>

          {lookup && (
            <Alert
              style={{ marginBottom: 16 }}
              type={lookup.exists ? (lookup.inBlacklist ? 'warning' : 'success') : 'info'}
              showIcon
              message={
                lookup.exists
                  ? `${lookup.personName ?? '-'}（${lookup.personNo ?? '-'}）· ${lookup.deptName ?? '无部门'}`
                  : lookup.message ?? '该卡号未登记'
              }
              description={
                lookup.exists ? (
                  <Space size={16} wrap>
                    <span>
                      卡状态：
                      {lookup.cardState ? cardStateMeta[lookup.cardState]?.text ?? lookup.cardState : '无卡'}
                    </span>
                    <span>有效期：{lookup.validDate ? dayjs(lookup.validDate).format('YYYY-MM-DD') : '长期'}</span>
                    <span>保留天数：{lookup.retainDays ?? 182} 天</span>
                    {lookup.inBlacklist && <Tag color="red">已在黑名单中</Tag>}
                  </Space>
                ) : undefined
              }
            />
          )}

          <Form.Item name="Reason" label="加入原因" rules={[{ required: true, message: '请填写加入原因' }, { max: 50 }]}>
            <Input.TextArea rows={3} placeholder="如：卡片遗失后被人冒用，需即时禁用" />
          </Form.Item>

          <Form.Item name="Del_Sign" valuePropName="checked">
            <Checkbox>标记为系统自动禁用（Del_Sign=1，立即置为可释放）</Checkbox>
          </Form.Item>
          <Form.Item name="SyncNow" valuePropName="checked">
            <Checkbox>同时创建设备名单下发任务（PERSON_NAME_DOWN）</Checkbox>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="批量导入黑名单"
        open={importOpen}
        onCancel={() => setImportOpen(false)}
        onOk={submitImport}
        confirmLoading={importSaving}
        okText="开始导入"
        width={560}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="每行一条，格式为「卡号,原因」，原因可省略。已在黑名单中的卡号会自动跳过。"
        />
        <Input.TextArea
          rows={10}
          value={importText}
          onChange={(event) => setImportText(event.target.value)}
          placeholder={'10001,卡片遗失\n10002\n10003,离职未交回'}
        />
      </Modal>

      <Drawer
        title="黑名单详情"
        width={480}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        extra={
          detail && detail.releaseable && canDelete ? (
            <Button danger size="small" onClick={() => openRelease(detail)}>
              释放
            </Button>
          ) : undefined
        }
      >
        {detail && (
          <Descriptions
            size="small"
            column={1}
            bordered
            items={[
              { key: 'card', label: '卡号', children: detail.cardNo || '-' },
              { key: 'personNo', label: '人员编号', children: detail.personNo || '-' },
              { key: 'personName', label: '姓名', children: detail.personName || '-' },
              { key: 'dept', label: '部门', children: detail.deptName || '-' },
              { key: 'delDate', label: '加入时间', children: formatDateTime(detail.delDate) },
              {
                key: 'source',
                label: '来源',
                children: <Tag color={sourceMeta[detail.source]?.color}>{sourceMeta[detail.source]?.text ?? detail.source}</Tag>,
              },
              { key: 'addUser', label: '操作人', children: detail.addUser || (detail.source === 'cs' ? 'CS 端' : '-') },
              { key: 'remark', label: '原因', children: detail.remark || '-' },
              {
                key: 'cardState',
                label: '卡状态',
                children: detail.cardState ? cardStateMeta[detail.cardState]?.text ?? detail.cardState : '无卡',
              },
              { key: 'retain', label: '保留天数', children: `${detail.retainDays} 天` },
              {
                key: 'releaseable',
                label: '释放条件',
                children: detail.releaseable ? (
                  <Tag color="green">已可释放</Tag>
                ) : (
                  <span>
                    需等待至 {detail.releaseableTime ? dayjs(detail.releaseableTime).format('YYYY-MM-DD') : '-'}
                  </span>
                ),
              },
            ]}
          />
        )}
      </Drawer>
    </div>
  );
}
