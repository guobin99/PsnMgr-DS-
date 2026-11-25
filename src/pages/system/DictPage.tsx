import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CloudDownloadOutlined, CloudUploadOutlined, PlusOutlined, ReloadOutlined, SyncOutlined } from '@ant-design/icons';
import { usePermission } from '@/hooks/usePermission';
import type {
  ConsistencyItem,
  DictItem,
  DictMetaColumn,
  DictMetaField,
  DictTable,
} from '@/types/systemConfig';
import {
  buildFixScript,
  createDictItem,
  deleteDictItem,
  downloadText,
  exportDictItems,
  fetchConsistency,
  fetchDictItems,
  fetchDictMetaColumns,
  fetchDictMetaFields,
  fetchDictMetaTables,
  fetchDictTables,
  importDictItems,
  syncDictMeta,
  updateDictItem,
} from '@/services/systemConfig';

const issueLabel: Record<string, { text: string; color: string }> = {
  metaOnly: { text: '元数据有、数据库无', color: 'red' },
  dbOnly: { text: '数据库有、元数据无', color: 'orange' },
  typeMismatch: { text: '类型或长度不一致', color: 'gold' },
  warning: { text: '编码质量警告', color: 'purple' },
};

/** 数据字典：编码字典 / 元数据 / 一致性检查 */
export default function DictPage() {
  const { message, modal } = App.useApp();
  const { has } = usePermission();

  const canCreate = has('system:dict:create');
  const canUpdate = has('system:dict:update');
  const canDelete = has('system:dict:delete');
  const canSync = has('system:dict:sync');

  const [tables, setTables] = useState<DictTable[]>([]);
  const [tableName, setTableName] = useState<string>('');
  const [items, setItems] = useState<DictItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [editRow, setEditRow] = useState<DictItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  const [form] = Form.useForm();

  const [metaAvailable, setMetaAvailable] = useState(true);
  const [metaMessage, setMetaMessage] = useState<string | null>(null);
  const [metaTables, setMetaTables] = useState<DictTable[]>([]);
  const [metaTable, setMetaTable] = useState<string>('');
  const [fields, setFields] = useState<DictMetaField[]>([]);
  const [columns, setColumns] = useState<DictMetaColumn[]>([]);
  const [issues, setIssues] = useState<ConsistencyItem[]>([]);
  const [issueLoading, setIssueLoading] = useState(false);

  const loadTables = useCallback(async () => {
    try {
      const rows = await fetchDictTables();
      setTables(rows);
      if (!tableName && rows.length > 0) setTableName(rows[0].tableName);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载编码表失败');
    }
  }, [message, tableName]);

  const loadItems = useCallback(
    async (name: string, key: string, nextPage: number, nextPageSize: number) => {
      if (!name) return;
      setLoading(true);
      try {
        const result = await fetchDictItems(name, key, nextPage, nextPageSize);
        setItems(result.items);
        setTotal(result.total);
      } catch (error) {
        message.error(error instanceof Error ? error.message : '加载编码失败');
      } finally {
        setLoading(false);
      }
    },
    [message],
  );

  useEffect(() => {
    loadTables();
  }, [loadTables]);

  useEffect(() => {
    setPage(1);
    loadItems(tableName, '', 1, pageSize);
  }, [tableName, pageSize, loadItems]);

  const loadMeta = useCallback(
    async (name: string) => {
      try {
        const result = await fetchDictMetaTables();
        setMetaAvailable(result.available);
        setMetaMessage(result.message ?? null);
        setMetaTables(result.items);
        if (result.available) {
          const target = name || result.items[0]?.tableName || '';
          setMetaTable(target);
          if (target) {
            const [fieldResult, columnResult] = await Promise.all([
              fetchDictMetaFields(target),
              fetchDictMetaColumns(target),
            ]);
            setFields(fieldResult.items);
            setColumns(columnResult.items);
          }
        }
      } catch (error) {
        message.error(error instanceof Error ? error.message : '加载元数据失败');
      }
    },
    [message],
  );

  const loadIssues = useCallback(async () => {
    setIssueLoading(true);
    try {
      const result = await fetchConsistency();
      setIssues(result.items);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载一致性检查失败');
    } finally {
      setIssueLoading(false);
    }
  }, [message]);

  const openCreate = () => {
    setEditRow(null);
    form.resetFields();
    form.setFieldsValue({ Dict_Id: '', Dict_Value: '', Is_SysCol: false, Remark: '' });
    setFormOpen(true);
  };

  const openEdit = (row: DictItem) => {
    setEditRow(row);
    form.setFieldsValue({
      Dict_Id: row.dictId,
      Dict_Value: row.dictValue,
      Is_SysCol: row.sysCol,
      Remark: row.remark,
    });
    setFormOpen(true);
  };

  const submitForm = async () => {
    const values = await form.validateFields();
    try {
      if (editRow) {
        await updateDictItem(editRow.id, {
          Dict_Id: values.Dict_Id,
          Dict_Value: values.Dict_Value,
          Remark: values.Remark,
          OldDict_Id: editRow.dictId ?? undefined,
          OldDict_Value: editRow.dictValue ?? undefined,
        });
        message.success('已保存');
      } else {
        await createDictItem({
          TableName: tableName,
          Dict_Id: values.Dict_Id,
          Dict_Value: values.Dict_Value,
          Is_SysCol: values.Is_SysCol,
          Remark: values.Remark,
        });
        message.success('已新增');
      }
      setFormOpen(false);
      loadItems(tableName, keyword, page, pageSize);
      loadTables();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败');
    }
  };

  const handleImport = () => {
    let parsed: Array<{ dictId: string; dictValue: string }>;
    try {
      const raw = JSON.parse(importText);
      const array = Array.isArray(raw) ? raw : raw?.items ?? [];
      parsed = (array as Array<Record<string, unknown>>).map((row) => ({
        dictId: String(row.dictId ?? row.Dict_Id ?? row.code ?? ''),
        dictValue: String(row.dictValue ?? row.Dict_Value ?? row.name ?? ''),
      }));
    } catch {
      message.error('内容不是合法的 JSON');
      return;
    }
    if (parsed.length === 0) {
      message.warning('没有解析到条目');
      return;
    }
    modal.confirm({
      title: '导入编码',
      content: `共 ${parsed.length} 条，${overwrite ? '重复编码将覆盖' : '重复编码将跳过'}。是否继续？`,
      okText: '导入',
      onOk: async () => {
        const result = await importDictItems(tableName, parsed, overwrite);
        message.success(`新增 ${result.inserted}、覆盖 ${result.updated}、跳过 ${result.skipped}`);
        setImportOpen(false);
        setImportText('');
        loadItems(tableName, keyword, 1, pageSize);
      },
    });
  };

  const itemColumns: ColumnsType<DictItem> = [
    { title: '编码', dataIndex: 'dictId', width: 120 },
    { title: '名称', dataIndex: 'dictValue', ellipsis: true },
    {
      title: '系统列',
      dataIndex: 'sysCol',
      width: 100,
      render: (value: boolean) => (value ? <Tag color="gold">系统列</Tag> : <Tag>普通</Tag>),
    },
    { title: '备注', dataIndex: 'remark', ellipsis: true },
    {
      title: '操作',
      width: 130,
      render: (_value, row) => (
        <Space size={4}>
          <Button size="small" type="link" disabled={!canUpdate} onClick={() => openEdit(row)}>
            修改
          </Button>
          <Popconfirm
            title="删除该编码？"
            description={row.sysCol ? '系统内置编码不可删除' : '删除后 CS 端可能显示空白'}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true, disabled: row.sysCol }}
            onConfirm={async () => {
              try {
                await deleteDictItem(row.id);
                message.success('已删除');
                loadItems(tableName, keyword, page, pageSize);
              } catch (error) {
                message.error(error instanceof Error ? error.message : '删除失败');
              }
            }}
          >
            <Button size="small" type="link" danger disabled={!canDelete || row.sysCol}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const metaFieldColumns: ColumnsType<DictMetaField> = [
    { title: '序号', dataIndex: 'fieldNo', width: 70 },
    { title: '字段名', dataIndex: 'fieldName', width: 180 },
    { title: '中文名', dataIndex: 'fieldNote', ellipsis: true },
    { title: '类型', dataIndex: 'fieldType', width: 110 },
    { title: '长度', dataIndex: 'fieldLength', width: 80 },
    { title: '主键', dataIndex: 'isPk', width: 70, render: (value: boolean) => (value ? <Tag color="blue">是</Tag> : '-') },
  ];

  const metaColumnColumns: ColumnsType<DictMetaColumn> = [
    { title: '列表', dataIndex: 'gridName', width: 140 },
    { title: '字段名', dataIndex: 'fieldName', width: 160 },
    { title: '显示名', dataIndex: 'displayName', width: 140 },
    { title: '宽度', dataIndex: 'displayLen', width: 80 },
    { title: '顺序', dataIndex: 'fieldIndex', width: 80 },
    { title: '显示', dataIndex: 'isShow', width: 80, render: (value: boolean) => (value ? '是' : '否') },
    { title: '合计', dataIndex: 'isSum', width: 80, render: (value: boolean) => (value ? '是' : '否') },
  ];

  const issueColumns: ColumnsType<ConsistencyItem> = [
    {
      title: '类型',
      dataIndex: 'issueType',
      width: 170,
      render: (value: string) => <Tag color={issueLabel[value]?.color ?? 'default'}>{issueLabel[value]?.text ?? value}</Tag>,
    },
    { title: '表', dataIndex: 'tableName', width: 160 },
    { title: '字段', dataIndex: 'fieldName', width: 150 },
    { title: '元数据', dataIndex: 'metaValue', width: 130 },
    { title: '数据库', dataIndex: 'dbValue', width: 130 },
    { title: '说明', dataIndex: 'message', ellipsis: true },
  ];

  const dictTab = (
    <div className="system-page" style={{ padding: 0 }}>
      <div className="system-context-card ant-card ant-card-bordered">
        <div className="ant-card-body">
          <h3 className="system-context-title">编码表</h3>
          <Input.Search
            allowClear
            placeholder="搜索编码表"
            style={{ marginBottom: 8 }}
            onSearch={async (value) => {
              try {
                const rows = await fetchDictTables(value.trim() || undefined);
                setTables(rows);
              } catch {
                message.error('加载失败');
              }
            }}
          />
          <div className="system-context-list">
            {tables.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无编码表" />
            ) : (
              tables.map((table) => (
                <button
                  key={table.tableName}
                  type="button"
                  className={`system-context-item${table.tableName === tableName ? ' is-active' : ''}`}
                  onClick={() => setTableName(table.tableName)}
                >
                  <strong>{table.tableChsName || table.tableName}</strong>
                  <span>
                    {table.tableName} · {table.itemCount} 项
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <section className="system-workspace">
        <div className="system-toolbar">
          <Input.Search
            allowClear
            placeholder="搜索编码或名称"
            style={{ width: 240 }}
            onSearch={(value) => {
              setKeyword(value.trim());
              setPage(1);
              loadItems(tableName, value.trim(), 1, pageSize);
            }}
          />
          <Space wrap>
            <Button type="primary" icon={<PlusOutlined />} disabled={!canCreate || !tableName} onClick={openCreate}>
              新增编码
            </Button>
            <Button icon={<CloudUploadOutlined />} disabled={!canCreate || !tableName} onClick={() => setImportOpen(true)}>
              导入
            </Button>
            <Button
              icon={<CloudDownloadOutlined />}
              disabled={!tableName}
              onClick={async () => {
                const result = await exportDictItems(tableName);
                downloadText(result.fileName, result.content);
              }}
            >
              导出
            </Button>
            <Button icon={<ReloadOutlined />} onClick={() => loadItems(tableName, keyword, page, pageSize)}>
              刷新
            </Button>
          </Space>
        </div>

        <Table
          rowKey="id"
          size="small"
          loading={loading}
          columns={itemColumns}
          dataSource={items}
          locale={{ emptyText: <Empty description="该编码表暂无编码" /> }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: [20, 50, 100],
            onChange: (nextPage, nextSize) => {
              setPage(nextPage);
              setPageSize(nextSize);
              loadItems(tableName, keyword, nextPage, nextSize);
            },
          }}
        />
      </section>
    </div>
  );

  const metaTab = !metaAvailable ? (
    <Alert type="warning" showIcon message={metaMessage ?? '当前数据库未包含字典元数据表'} />
  ) : (
    <div className="system-page" style={{ padding: 0 }}>
      <div className="system-context-card ant-card ant-card-bordered">
        <div className="ant-card-body">
          <h3 className="system-context-title">元数据表</h3>
          <div className="system-context-list">
            {metaTables.map((table) => (
              <button
                key={table.tableName}
                type="button"
                className={`system-context-item${table.tableName === metaTable ? ' is-active' : ''}`}
                onClick={async () => {
                  setMetaTable(table.tableName);
                  const [fieldResult, columnResult] = await Promise.all([
                    fetchDictMetaFields(table.tableName),
                    fetchDictMetaColumns(table.tableName),
                  ]);
                  setFields(fieldResult.items);
                  setColumns(columnResult.items);
                }}
              >
                <strong>{table.tableChsName || table.tableName}</strong>
                <span>{table.tableName}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <section className="system-workspace">
        <div className="system-toolbar">
          <Typography.Text strong>{metaTable || '未选择表'}</Typography.Text>
          <Button
            icon={<SyncOutlined />}
            disabled={!canSync || !metaTable}
            onClick={async () => {
              try {
                const result = await syncDictMeta(metaTable);
                message.success(`新增 ${result.inserted}、更新 ${result.updated}、待确认 ${result.pending}`);
                const fieldResult = await fetchDictMetaFields(metaTable);
                setFields(fieldResult.items);
              } catch (error) {
                message.error(error instanceof Error ? error.message : '同步失败');
              }
            }}
          >
            从数据库同步字段
          </Button>
        </div>
        <Tabs
          items={[
            { key: 'fields', label: '字段', children: <Table rowKey="id" size="small" dataSource={fields} columns={metaFieldColumns} pagination={false} /> },
            { key: 'columns', label: '列配置', children: <Table rowKey="id" size="small" dataSource={columns} columns={metaColumnColumns} pagination={false} /> },
          ]}
        />
      </section>
    </div>
  );

  const consistencyTab = (
    <div>
      <div className="system-toolbar">
        <Space>
          <Button icon={<ReloadOutlined />} loading={issueLoading} onClick={loadIssues}>
            重新检查
          </Button>
          <Button
            disabled={!canSync}
            onClick={async () => {
              try {
                const result = await buildFixScript();
                downloadText(result.fileName, result.content);
                message.success('修复脚本已生成，请由 DBA 审核后执行');
              } catch (error) {
                message.error(error instanceof Error ? error.message : '生成失败');
              }
            }}
          >
            生成修复脚本
          </Button>
        </Space>
        <Typography.Text type="secondary">检查只读，不会自动修改数据；修复脚本只包含新增与更新。</Typography.Text>
      </div>
      <Table
        rowKey={(row) => `${row.issueType}-${row.tableName}-${row.fieldName ?? ''}-${row.message ?? ''}`}
        size="small"
        loading={issueLoading}
        dataSource={issues}
        columns={issueColumns}
        pagination={{ pageSize: 20 }}
        locale={{ emptyText: <Empty description="未发现差异" /> }}
      />
    </div>
  );

  return (
    <div className="system-workspace system-page-single" style={{ padding: 0 }}>
      <Card size="small" styles={{ body: { paddingTop: 0 } }}>
        <Tabs
          items={[
            { key: 'dict', label: '编码字典', children: dictTab },
            { key: 'meta', label: '元数据', children: metaTab },
            { key: 'consistency', label: '一致性检查', children: consistencyTab },
          ]}
          onChange={(key) => {
            if (key === 'meta') loadMeta(tableName);
            if (key === 'consistency') loadIssues();
          }}
        />
      </Card>

      <Modal
        title={editRow ? '修改编码' : '新增编码'}
        open={formOpen}
        onCancel={() => setFormOpen(false)}
        onOk={submitForm}
        okText="保存"
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="Dict_Id" label="编码" extra="留空则自动取同表最大编码加一；必须为数字">
            <Input placeholder="如 10" disabled={Boolean(editRow?.sysCol)} />
          </Form.Item>
          <Form.Item name="Dict_Value" label="名称" rules={[{ required: true, message: '请输入名称' }, { max: 40 }]}>
            <Input />
          </Form.Item>
          <Form.Item name="Is_SysCol" label="系统列" valuePropName="checked" extra="系统列不允许删除">
            <Switch disabled={Boolean(editRow)} />
          </Form.Item>
          <Form.Item name="Remark" label="备注">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="导入编码"
        open={importOpen}
        onCancel={() => setImportOpen(false)}
        onOk={handleImport}
        okText="导入"
        width={560}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space>
            <span>重复编码：</span>
            <Select
              value={overwrite ? 'overwrite' : 'skip'}
              style={{ width: 140 }}
              onChange={(value) => setOverwrite(value === 'overwrite')}
              options={[
                { value: 'skip', label: '跳过' },
                { value: 'overwrite', label: '覆盖' },
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
            rows={12}
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
            placeholder={'[\n  { "dictId": "10", "dictValue": "说明" }\n]'}
          />
        </Space>
      </Modal>
    </div>
  );
}
