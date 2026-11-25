import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  App,
  Button,
  DatePicker,
  Drawer,
  Empty,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Tree,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { DataNode } from 'antd/es/tree';
import {
  CloudDownloadOutlined,
  CloudUploadOutlined,
  DatabaseOutlined,
  ReloadOutlined,
  SaveOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { usePermission } from '@/hooks/usePermission';
import type { ParamBackup, ParamItem, ParamScopeNode } from '@/types/systemConfig';
import {
  createParamBackup,
  deleteParamBackup,
  downloadText,
  exportParams,
  fetchParamBackups,
  fetchParamGroups,
  fetchParams,
  importParams,
  previewParamImport,
  resetParams,
  restoreParamBackup,
  saveParams,
} from '@/services/systemConfig';
import { formatDateTime } from './shared';

/** 解析枚举选项：兼容裸值（0;1;2）与带标签（0=消费扣款;1=订餐扣款）两种格式。 */
function parseOptions(raw?: string | null): Array<{ label: string; value: string }> {
  return (raw ?? '')
    .split(/[;|,]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part) => {
      const eq = part.indexOf('=');
      if (eq > 0) {
        return { value: part.slice(0, eq).trim(), label: part.slice(eq + 1).trim() };
      }
      return { value: part, label: part };
    })
    .filter((option) => option.value.length > 0);
}

/** 系统参数：左侧作用域树，右侧按元数据编辑参数值 */
export default function ParamPage() {
  const { message, modal } = App.useApp();
  const { has } = usePermission();

  const [scopes, setScopes] = useState<ParamScopeNode[]>([]);
  const [scope, setScope] = useState('ST');
  const [groupName, setGroupName] = useState<string | undefined>();
  const [keyword, setKeyword] = useState('');
  const [items, setItems] = useState<ParamItem[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  const [backupOpen, setBackupOpen] = useState(false);
  const [backups, setBackups] = useState<ParamBackup[]>([]);
  const [backupLoading, setBackupLoading] = useState(false);

  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importScope, setImportScope] = useState('ST');

  const canUpdate = has('system:param:update');
  const canBackup = has('system:param:backup');
  const canRestore = has('system:param:restore');
  const canImport = has('system:param:import');
  const canExport = has('system:param:export');

  const load = useCallback(
    (nextScope: string, nextGroup?: string, nextKeyword?: string) => {
      setLoading(true);
      fetchParams(nextScope, nextGroup, nextKeyword)
        .then((result) => {
          setItems(result.items);
          setWarning(result.warning ?? null);
          setEdits({});
        })
        .catch((error) => message.error(error instanceof Error ? error.message : '加载参数失败'))
        .finally(() => setLoading(false));
    },
    [message],
  );

  useEffect(() => {
    fetchParamGroups()
      .then((nodes) => {
        // 参数数量为 0 的作用域/分组不进入左侧树
        const visible = nodes
          .map((node) => ({
            ...node,
            groups: node.groups.filter((group) => group.count > 0),
          }))
          .filter((node) => node.groups.reduce((sum, group) => sum + group.count, 0) > 0);
        setScopes(visible);
        const first = visible.find((node) => node.scope === 'ST') ?? visible[0];
        if (first) {
          setScope(first.scope);
          setGroupName(undefined);
        }
      })
      .catch(() => setScopes([]));
  }, []);

  useEffect(() => {
    load(scope, groupName, keyword);
  }, [scope, groupName, load]);

  const treeData = useMemo<DataNode[]>(
    () =>
      scopes.map((node) => ({
        key: `scope:${node.scope}`,
        title: (
          <span>
            {node.scopeName}
            <span style={{ marginLeft: 8, color: '#98a2b3', fontSize: 10 }}>{node.groups.reduce((s, g) => s + g.count, 0)}</span>
          </span>
        ),
        children: node.groups
          .filter((group) => group.count > 0)
          .map((group) => ({
            key: `group:${node.scope}:${group.groupName}`,
            title: (
              <span>
                {group.groupName}
                <span style={{ marginLeft: 8, color: '#98a2b3', fontSize: 10 }}>{group.count}</span>
              </span>
            ),
          })),
      })),
    [scopes],
  );

  const currentValue = (item: ParamItem) => edits[item.code] ?? item.value ?? '';
  const isDirty = (item: ParamItem) => Object.prototype.hasOwnProperty.call(edits, item.code) && edits[item.code] !== (item.value ?? '');
  const dirtyCount = items.filter(isDirty).length;

  const setValue = (code: string, value: string) => setEdits((prev) => ({ ...prev, [code]: value }));

  const handleSave = async () => {
    const payload = items
      .filter(isDirty)
      .map((item) => ({ paramCode: item.code, value: currentValue(item), oldValue: item.value ?? '' }));
    if (payload.length === 0) {
      message.info('没有修改任何参数');
      return;
    }
    setSaving(true);
    try {
      const result = await saveParams(scope, payload);
      const hint = result.needRestart?.length
        ? `；以下参数需重启服务后生效：${result.needRestart.join('、')}`
        : '；CS 端需重新进入子系统或重启后生效';
      message.success(`已保存 ${result.savedCount} 项${hint}`);
      load(scope, groupName, keyword);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    const targets = items.filter((item) => item.defaultValue);
    if (targets.length === 0) {
      message.info('当前作用域没有可恢复的默认值');
      return;
    }
    modal.confirm({
      title: '恢复默认值',
      content: `将把 ${targets.length} 项参数恢复为元数据默认值，无默认值的参数会被跳过。是否继续？`,
      okText: '恢复',
      cancelText: '取消',
      onOk: async () => {
        try {
          const result = await resetParams(scope, []);
          message.success(`已恢复 ${result.changedCount} 项，跳过 ${result.skippedCount} 项`);
          load(scope, groupName, keyword);
        } catch (error) {
          message.error(error instanceof Error ? error.message : '恢复失败');
        }
      },
    });
  };

  const openBackups = async () => {
    setBackupOpen(true);
    setBackupLoading(true);
    try {
      setBackups(await fetchParamBackups(scope));
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载备份失败');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setBackupLoading(true);
    try {
      const result = await createParamBackup(scope);
      message.success(`备份完成，共 ${result.itemCount} 项`);
      setBackups(await fetchParamBackups(scope));
    } catch (error) {
      message.error(error instanceof Error ? error.message : '备份失败');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const result = await exportParams(scope);
      downloadText(result.fileName, result.content);
      message.success(`已导出 ${result.itemCount ?? 0} 项`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '导出失败');
    }
  };

  const handlePreviewImport = async () => {
    let parsed: Array<{ code: string; value: string }>;
    try {
      const raw = JSON.parse(importText);
      const array = Array.isArray(raw) ? raw : raw?.items ?? raw?.Items ?? [];
      parsed = (array as Array<Record<string, unknown>>).map((row) => ({
        code: String(row.code ?? row.Code ?? row.paramCode ?? ''),
        value: String(row.value ?? row.Value ?? ''),
      }));
    } catch {
      message.error('文件内容不是合法的 JSON');
      return;
    }
    if (parsed.length === 0) {
      message.warning('没有解析到参数条目');
      return;
    }
    try {
      const plan = await previewParamImport(importScope, parsed);
      modal.confirm({
        title: '导入预演',
        width: 560,
        content: (
          <div style={{ lineHeight: 1.9 }}>
            <div>新增：{plan.newCount} 项（仅 BS 作用域允许新增）</div>
            <div>修改：{plan.modifiedCount} 项</div>
            <div>无变化：{plan.unchanged.length} 项</div>
            <div style={{ color: plan.conflicts.length ? '#cf1322' : undefined }}>冲突：{plan.conflicts.length} 项</div>
            {plan.conflicts.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#cf1322' }}>{plan.conflicts.slice(0, 5).join('；')}</div>
            )}
          </div>
        ),
        okText: '确认导入',
        cancelText: '取消',
        okButtonProps: { disabled: plan.conflicts.length > 0 },
        onOk: async () => {
          const result = await importParams(importScope, parsed);
          message.success(`已导入 ${result.savedCount} 项`);
          setImportOpen(false);
          setImportText('');
          if (importScope === scope) load(scope, groupName, keyword);
        },
      });
    } catch (error) {
      message.error(error instanceof Error ? error.message : '预演失败');
    }
  };

  const columns: ColumnsType<ParamItem> = [
    {
      title: '参数编码',
      dataIndex: 'code',
      width: 190,
      render: (value: string, item) => (
        <Space size={4}>
          <Typography.Text code>{value}</Typography.Text>
          {item.readOnly && <Tag>只读</Tag>}
        </Space>
      ),
    },
    { title: '参数名称', dataIndex: 'name', width: 180, ellipsis: true },
    {
      title: '当前值',
      dataIndex: 'value',
      render: (_value, item) => {
        const value = currentValue(item);
        const disabled = !canUpdate || item.readOnly || item.type === 'datetime';
        const options = parseOptions(item.options);
        if (item.type === 'bool' && options.length <= 2) {
          return (
            <Switch
              checked={value === '1' || value.toLowerCase() === 'true'}
              disabled={disabled}
              onChange={(checked) => setValue(item.code, checked ? '1' : '0')}
            />
          );
        }
        if (item.type === 'enum' && options.length > 0) {
          return (
            <Select
              style={{ width: '100%' }}
              value={value || undefined}
              disabled={disabled}
              options={options}
              onChange={(next) => setValue(item.code, next)}
            />
          );
        }
        if (item.type === 'enumSet' && options.length > 0) {
          return (
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              value={value ? value.split(';').filter(Boolean) : []}
              disabled={disabled}
              options={options}
              onChange={(next) => setValue(item.code, next.join(';'))}
            />
          );
        }
        if (item.type === 'date') {
          return (
            <DatePicker
              style={{ width: '100%' }}
              value={value ? dayjs(value) : null}
              disabled={disabled}
              onChange={(date) => setValue(item.code, date ? date.format('YYYY-MM-DD') : '')}
            />
          );
        }
        if (item.type === 'int' || item.type === 'decimal') {
          return (
            <InputNumber
              style={{ width: '100%' }}
              value={value === '' ? undefined : Number(value)}
              disabled={disabled}
              min={item.minValue ? Number(item.minValue) : undefined}
              max={item.maxValue ? Number(item.maxValue) : undefined}
              onChange={(next) => setValue(item.code, next === null || next === undefined ? '' : String(next))}
            />
          );
        }
        return (
          <Input
            value={value}
            disabled={disabled}
            onChange={(event) => setValue(item.code, event.target.value)}
            placeholder={item.type === 'datetime' ? '暂不支持在线修改，请在 CS 端调整' : undefined}
          />
        );
      },
    },
    {
      title: '默认值',
      dataIndex: 'defaultValue',
      width: 140,
      render: (value?: string | null) => value || <span style={{ color: '#98a2b3' }}>-</span>,
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 90,
      render: (value: string) => <Tag color="blue">{value}</Tag>,
    },
    { title: '分组', dataIndex: 'groupName', width: 110, render: (value?: string | null) => value ?? '未分组' },
    {
      title: '需重启',
      dataIndex: 'restartRequired',
      width: 80,
      render: (value: boolean) => (value ? <Tag color="orange">是</Tag> : <Tag>否</Tag>),
    },
    {
      title: '状态',
      width: 90,
      render: (_value, item) =>
        isDirty(item) ? <Tag color="processing">未保存</Tag> : item.modified ? <Tag color="gold">已修改</Tag> : <Tag>默认</Tag>,
    },
    {
      title: '更新时间',
      dataIndex: 'updatedTime',
      width: 150,
      render: (value?: string | null) => formatDateTime(value),
    },
  ];

  return (
    <div className="system-page">
      <div className="system-context-card ant-card ant-card-bordered">
        <div className="ant-card-body">
          <h3 className="system-context-title">作用域</h3>
          <Tree
            blockNode
            defaultExpandAll
            treeData={treeData}
            selectedKeys={[groupName ? `group:${scope}:${groupName}` : `scope:${scope}`]}
            onSelect={(keys) => {
              const key = String(keys[0] ?? '');
              if (key.startsWith('scope:')) {
                setScope(key.slice(6));
                setGroupName(undefined);
              } else if (key.startsWith('group:')) {
                const [, scopeKey, ...rest] = key.split(':');
                setScope(scopeKey);
                setGroupName(rest.join(':'));
              }
            }}
          />
        </div>
      </div>

      <section className="system-workspace">
        <div className="system-toolbar">
          <Space wrap>
            <Input.Search
              allowClear
              placeholder="搜索编码或名称"
              style={{ width: 240 }}
              onSearch={(value) => {
                setKeyword(value.trim());
                load(scope, groupName, value.trim());
              }}
            />
            <Button icon={<ReloadOutlined />} onClick={() => load(scope, groupName, keyword)}>
              刷新
            </Button>
          </Space>
          <Space wrap>
            <Button type="primary" icon={<SaveOutlined />} disabled={!canUpdate || dirtyCount === 0} loading={saving} onClick={handleSave}>
              保存{dirtyCount > 0 ? `(${dirtyCount})` : ''}
            </Button>
            <Button icon={<UndoOutlined />} disabled={!canRestore} onClick={handleReset}>
              恢复默认
            </Button>
            <Button icon={<DatabaseOutlined />} disabled={!canBackup} onClick={openBackups}>
              备份
            </Button>
            <Button
              icon={<CloudUploadOutlined />}
              disabled={!canImport}
              onClick={() => {
                setImportScope(scope);
                setImportOpen(true);
              }}
            >
              导入
            </Button>
            <Button icon={<CloudDownloadOutlined />} disabled={!canExport} onClick={handleExport}>
              导出
            </Button>
          </Space>
        </div>

        {warning && <Alert type="warning" showIcon style={{ marginBottom: 12 }} message={warning} />}
        {!canUpdate && <Alert type="info" showIcon style={{ marginBottom: 12 }} message="当前账号只有查看权限，参数为只读展示。" />}

        <Table
          rowKey="code"
          size="small"
          loading={loading}
          columns={columns}
          dataSource={items}
          pagination={{ pageSize: 20, showSizeChanger: true, pageSizeOptions: [20, 50, 100] }}
          scroll={{ x: 1180 }}
          locale={{ emptyText: <Empty description="该作用域暂无参数" /> }}
        />
      </section>

      <Drawer title={`参数备份（${scope}）`} width={640} open={backupOpen} onClose={() => setBackupOpen(false)}>
        <Space style={{ marginBottom: 12 }}>
          <Button type="primary" icon={<DatabaseOutlined />} disabled={!canBackup} loading={backupLoading} onClick={handleCreateBackup}>
            创建备份
          </Button>
          <Button icon={<ReloadOutlined />} onClick={openBackups}>
            刷新
          </Button>
        </Space>
        <Table
          rowKey="backupId"
          size="small"
          loading={backupLoading}
          dataSource={backups}
          pagination={false}
          columns={[
            { title: '编号', dataIndex: 'backupId', width: 70 },
            { title: '名称', dataIndex: 'backupName', ellipsis: true },
            { title: '条目', dataIndex: 'itemCount', width: 70 },
            { title: '创建人', dataIndex: 'createUser', width: 90 },
            { title: '时间', dataIndex: 'createTime', width: 150, render: (value: string) => formatDateTime(value) },
            {
              title: '操作',
              width: 110,
              render: (_value, row) => (
                <Space size={4}>
                  <Tooltip title="按快照恢复参数值">
                    <Button
                      size="small"
                      type="link"
                      disabled={!canRestore}
                      onClick={() =>
                        modal.confirm({
                          title: '恢复备份',
                          content: `将按备份 ${row.backupName} 恢复参数值，仅覆盖有差异的参数。`,
                          okText: '恢复',
                          onOk: async () => {
                            const result = await restoreParamBackup(row.backupId);
                            message.success(`已恢复 ${result.changedCount} 项`);
                            load(scope, groupName, keyword);
                          },
                        })
                      }
                    >
                      恢复
                    </Button>
                  </Tooltip>
                  <Popconfirm
                    title="删除该备份？"
                    okText="删除"
                    cancelText="取消"
                    onConfirm={async () => {
                      await deleteParamBackup(row.backupId);
                      message.success('已删除');
                      setBackups(await fetchParamBackups(scope));
                    }}
                  >
                    <Button size="small" type="link" danger disabled={!canBackup}>
                      删除
                    </Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Drawer>

      <Drawer
        title="导入参数"
        width={640}
        open={importOpen}
        onClose={() => setImportOpen(false)}
        extra={
          <Button type="primary" disabled={!importText.trim()} onClick={handlePreviewImport}>
            预演并导入
          </Button>
        }
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="支持 JSON 数组，元素形如 { code, value }。CS 作用域只允许修改已有编码；新增编码仅 BS 作用域允许。"
        />
        <Space style={{ marginBottom: 12 }}>
          <Select
            value={importScope}
            style={{ width: 180 }}
            onChange={setImportScope}
            options={[
              { value: 'ST', label: 'ST 公共与卡务' },
              { value: 'KQ', label: 'KQ 考勤' },
              { value: 'MJ', label: 'MJ 门禁' },
              { value: 'SF', label: 'SF 售饭与灵活消费' },
              { value: 'SK', label: 'SK 水控' },
              { value: 'FK', label: 'FK 访客' },
              { value: 'DC', label: 'DC 订餐' },
              { value: 'BS', label: 'BS 运行' },
            ]}
          />
          <input
            type="file"
            accept=".json,application/json"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setImportText(await file.text());
            }}
          />
        </Space>
        <Input.TextArea
          rows={16}
          value={importText}
          onChange={(event) => setImportText(event.target.value)}
          placeholder={'[\n  { "code": "ExpenseIntervalTime", "value": "5" }\n]'}
        />
      </Drawer>
    </div>
  );
}
