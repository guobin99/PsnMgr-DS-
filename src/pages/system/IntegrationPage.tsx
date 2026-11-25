import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  App,
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Tree,
  Typography,
} from 'antd';
import type { DataNode } from 'antd/es/tree';
import {
  ApiOutlined,
  LockOutlined,
  ReloadOutlined,
  RollbackOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { usePermission } from '@/hooks/usePermission';
import type { Endpoint, SyncTask } from '@/types/systemConfig';
import {
  createEndpoint,
  fetchEndpoints,
  fetchSyncTasks,
  rollbackEndpointSecret,
  runSyncTask,
  setEndpointSecret,
  testEndpoint,
  toggleEndpoint,
  updateEndpoint,
  updateSyncTask,
} from '@/services/systemConfig';
import { formatDateTime } from './shared';

const typeLabel: Record<string, string> = {
  database: '数据库',
  http: 'HTTP 服务',
  device: '设备服务',
  wechat: '微信',
  payment: '支付',
  sms: '短信',
  storage: '存储',
};

const healthMeta = (status: number) => {
  if (status === 1) return { status: 'success' as const, text: '正常' };
  if (status === 2) return { status: 'error' as const, text: '异常' };
  return { status: 'default' as const, text: '未知' };
};

/** 接口与集成：端点卡片、密钥掩码、连通测试与同步任务 */
export default function IntegrationPage() {
  const { message, modal } = App.useApp();
  const { has } = usePermission();
  const canUpdate = has('system:integration:update');
  const canTest = has('system:integration:test');
  const canToggle = has('system:integration:toggle');

  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [keyword, setKeyword] = useState('');
  const [activeType, setActiveType] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const [detail, setDetail] = useState<Endpoint | null>(null);
  const [tasks, setTasks] = useState<SyncTask[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm();

  const [secretOpen, setSecretOpen] = useState(false);
  const [secretForm] = Form.useForm();
  const [testing, setTesting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEndpoints(await fetchEndpoints({ keyword: keyword.trim() || undefined, type: activeType }));
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载端点失败');
    } finally {
      setLoading(false);
    }
  }, [message, keyword, activeType]);

  useEffect(() => {
    load();
  }, [load]);

  const treeData = useMemo<DataNode[]>(
    () => [
      { key: 'all', title: '全部端点' },
      { key: 'database', title: '数据库' },
      { key: 'http', title: '设备服务' },
      { key: 'wechat', title: '微信' },
      { key: 'payment', title: '支付' },
      { key: 'sms', title: '短信' },
      { key: 'storage', title: '其他' },
    ],
    [],
  );

  const openDetail = async (endpoint: Endpoint) => {
    setCreating(false);
    setDetail(endpoint);
    setDrawerOpen(true);
    form.setFieldsValue({
      Endpoint_Code: endpoint.endpointCode,
      Endpoint_Name: endpoint.endpointName,
      Endpoint_Type: endpoint.endpointType,
      Base_Url: endpoint.baseUrl,
      Auth_Mode: endpoint.authMode ?? 'none',
      Config_Json: endpoint.configJson ?? '',
      Timeout_Sec: endpoint.timeoutSec ?? 15,
      Retry_Count: endpoint.retryCount ?? 1,
      Is_Enabled: endpoint.isEnabled,
      Sort_No: endpoint.sortNo ?? 99,
    });
    try {
      setTasks(await fetchSyncTasks({ endpointCode: endpoint.endpointCode }));
    } catch {
      setTasks([]);
    }
  };

  const openCreate = () => {
    setCreating(true);
    setDetail(null);
    setTasks([]);
    setDrawerOpen(true);
    form.resetFields();
    form.setFieldsValue({ Endpoint_Type: 'http', Auth_Mode: 'none', Timeout_Sec: 15, Retry_Count: 1, Is_Enabled: true, Sort_No: 99 });
  };

  const submit = async () => {
    const values = await form.validateFields();
    try {
      if (creating) {
        await createEndpoint(values);
        message.success('端点已创建，请补充密钥');
      } else if (detail) {
        await updateEndpoint(detail.endpointCode, values);
        message.success('已保存');
      }
      setDrawerOpen(false);
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败');
    }
  };

  const handleTest = async (code: string) => {
    setTesting(code);
    try {
      const result = await testEndpoint(code);
      if (result.success) message.success(`连通正常，耗时 ${result.elapsed} ms：${result.message}`);
      else message.warning(`连通失败：${result.message}`);
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '测试失败');
    } finally {
      setTesting(null);
    }
  };

  const handleSecret = async () => {
    const values = await secretForm.validateFields();
    if (!detail) return;
    try {
      await setEndpointSecret(detail.endpointCode, values.Secret, values.Secret_Confirm, values.Reason);
      message.success('密钥已更新');
      setSecretOpen(false);
      secretForm.resetFields();
      if (detail) {
        const refreshed = (await fetchEndpoints()).find((item) => item.endpointCode === detail.endpointCode);
        if (refreshed) setDetail(refreshed);
      }
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '密钥更新失败');
    }
  };

  const taskColumns = [
    { title: '任务编码', dataIndex: 'taskCode', width: 170 },
    { title: '名称', dataIndex: 'taskName', width: 160 },
    { title: '方向', dataIndex: 'direction', width: 80 },
    { title: '定时', dataIndex: 'cronExpr', width: 120, render: (value?: string | null) => value || '仅手动' },
    {
      title: '启用',
      dataIndex: 'isEnabled',
      width: 80,
      render: (value: boolean, row: SyncTask) => (
        <Switch
          size="small"
          checked={value}
          disabled={!canUpdate}
          onChange={async (checked) => {
            try {
              await updateSyncTask(row.taskCode, { Is_Enabled: checked, Batch_Size: row.batchSize, Timeout_Sec: row.timeoutSec, Cron_Expr: row.cronExpr });
              message.success(checked ? '已启用' : '已停用');
              setTasks(await fetchSyncTasks({ endpointCode: detail?.endpointCode }));
            } catch (error) {
              message.error(error instanceof Error ? error.message : '操作失败');
            }
          }}
        />
      ),
    },
    { title: '最近运行', dataIndex: 'lastRunTime', width: 150, render: (value?: string | null) => formatDateTime(value) },
    { title: '最近结果', dataIndex: 'lastMessage', ellipsis: true },
    {
      title: '操作',
      width: 90,
      render: (_value: unknown, row: SyncTask) => (
        <Tooltip title="立即执行一次">
          <Button
            size="small"
            type="link"
            disabled={!canTest}
            onClick={async () => {
              try {
                await runSyncTask(row.taskCode);
                message.success('已提交执行');
                setTasks(await fetchSyncTasks({ endpointCode: detail?.endpointCode }));
              } catch (error) {
                message.error(error instanceof Error ? error.message : '执行失败');
              }
            }}
          >
            执行
          </Button>
        </Tooltip>
      ),
    },
  ];

  return (
    <div className="system-page">
      <div className="system-context-card ant-card ant-card-bordered">
        <div className="ant-card-body">
          <h3 className="system-context-title">端点类型</h3>
          <Tree
            blockNode
            defaultExpandAll
            treeData={treeData}
            selectedKeys={[activeType ?? 'all']}
            onSelect={(keys) => {
              const key = String(keys[0] ?? 'all');
              setActiveType(key === 'all' ? undefined : key);
            }}
          />
        </div>
      </div>

      <section className="system-workspace">
        <div className="system-toolbar">
          <Input.Search
            allowClear
            placeholder="搜索编码、名称或地址"
            style={{ width: 260 }}
            onSearch={(value) => setKeyword(value)}
          />
          <Space>
            <Button icon={<ReloadOutlined />} onClick={load}>
              刷新
            </Button>
            <Button type="primary" disabled={!canUpdate} onClick={openCreate}>
              新增端点
            </Button>
          </Space>
        </div>

        {endpoints.length === 0 ? (
          <Card loading={loading}>
            <Empty description="暂无端点" />
          </Card>
        ) : (
          <Row gutter={[12, 12]}>
            {endpoints.map((endpoint) => {
              const health = healthMeta(endpoint.healthStatus);
              return (
                <Col key={endpoint.endpointCode} xs={24} xl={12}>
                  <Card
                    size="small"
                    loading={loading}
                    className="system-endpoint-card"
                    title={
                      <Space>
                        <ApiOutlined />
                        <span>{endpoint.endpointName}</span>
                        <Tag>{typeLabel[endpoint.endpointType] ?? endpoint.endpointType}</Tag>
                        <Badge status={health.status} text={health.text} />
                      </Space>
                    }
                    extra={
                      <Space size={4}>
                        <Tooltip title="连通测试">
                          <Button
                            size="small"
                            icon={<ThunderboltOutlined />}
                            loading={testing === endpoint.endpointCode}
                            disabled={!canTest}
                            onClick={() => handleTest(endpoint.endpointCode)}
                          />
                        </Tooltip>
                        <Switch
                          size="small"
                          checked={endpoint.isEnabled}
                          disabled={!canToggle}
                          onChange={async (checked) => {
                            try {
                              await toggleEndpoint(endpoint.endpointCode, checked);
                              message.success(checked ? '已启用' : '已停用，相关同步任务自动暂停');
                              await load();
                            } catch (error) {
                              message.error(error instanceof Error ? error.message : '操作失败');
                            }
                          }}
                        />
                      </Space>
                    }
                    hoverable
                    onClick={() => openDetail(endpoint)}
                  >
                    <div className="system-subsystem-meta">
                      <Typography.Text code>{endpoint.endpointCode}</Typography.Text>
                      <Typography.Text type="secondary" ellipsis>
                        {endpoint.baseUrl || '未配置地址'}
                      </Typography.Text>
                      <div style={{ marginTop: 6 }}>
                        {endpoint.hasSecret ? (
                          <Tag icon={<LockOutlined />} color="green">
                            已配置密钥
                          </Tag>
                        ) : (
                          <Tag color="default">未配置密钥</Tag>
                        )}
                        <span style={{ marginLeft: 8, fontSize: 12, color: '#98a2b3' }}>
                          最近检查：{formatDateTime(endpoint.lastCheckTime)}
                        </span>
                      </div>
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </section>

      <Drawer
        title={creating ? '新增集成端点' : `端点：${detail?.endpointCode ?? ''}`}
        width={720}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        extra={
          <Space>
            {!creating && detail && (
              <Button
                icon={<RollbackOutlined />}
                disabled={!canUpdate || detail.secretHistoryCount === 0}
                onClick={() =>
                  modal.confirm({
                    title: '回滚密钥',
                    content: '将把密钥恢复到上一版本，回滚动作会记入审计。',
                    okText: '回滚',
                    onOk: async () => {
                      try {
                        await rollbackEndpointSecret(detail.endpointCode, '页面回滚');
                        message.success('已回滚');
                        await load();
                      } catch (error) {
                        message.error(error instanceof Error ? error.message : '回滚失败');
                      }
                    },
                  })
                }
              >
                回滚密钥
              </Button>
            )}
            <Button type="primary" disabled={!canUpdate} onClick={submit}>
              保存
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Tabs
            items={[
              {
                key: 'base',
                label: '基本配置',
                children: (
                  <>
                    <Form.Item name="Endpoint_Code" label="端点编码" rules={[{ required: true, message: '请输入编码' }]}>
                      <Input disabled={!creating} placeholder="如 MOC_API，创建后不可修改" />
                    </Form.Item>
                    <Form.Item name="Endpoint_Name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
                      <Input />
                    </Form.Item>
                    <Form.Item name="Endpoint_Type" label="类型" rules={[{ required: true }]}>
                      <Select
                        options={Object.keys(typeLabel).map((value) => ({ value, label: typeLabel[value] }))}
                        disabled={!creating}
                      />
                    </Form.Item>
                    <Form.Item name="Base_Url" label="地址">
                      <Input placeholder="http://192.168.0.110:8080/" />
                    </Form.Item>
                    <Space size={12}>
                      <Form.Item name="Timeout_Sec" label="超时(秒)">
                        <InputNumber min={1} max={120} />
                      </Form.Item>
                      <Form.Item name="Retry_Count" label="重试次数">
                        <InputNumber min={0} max={9} />
                      </Form.Item>
                      <Form.Item name="Sort_No" label="排序">
                        <InputNumber min={0} max={999} />
                      </Form.Item>
                    </Space>
                    <Form.Item name="Is_Enabled" label="启用" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                    <Form.Item name="Config_Json" label="扩展配置（非敏感，JSON）">
                      <Input.TextArea rows={5} placeholder={'{ "callbackUrl": "http://192.168.0.110:8081/" }'} />
                    </Form.Item>
                  </>
                ),
              },
              {
                key: 'secret',
                label: '认证与密钥',
                children: (
                  <>
                    <Form.Item name="Auth_Mode" label="认证方式">
                      <Select
                        options={['none', 'apikey', 'basic', 'oauth', 'sign', 'cert'].map((value) => ({ value, label: value }))}
                      />
                    </Form.Item>
                    <Alert
                      type={detail?.hasSecret ? 'success' : 'warning'}
                      showIcon
                      message={
                        detail?.hasSecret
                          ? `已配置（最近更新于 ${formatDateTime(detail.secretUpdatedTime)}），密钥内容不会回显`
                          : '密钥未配置'
                      }
                      style={{ marginBottom: 12 }}
                    />
                    <Button
                      type="primary"
                      ghost
                      icon={<LockOutlined />}
                      disabled={!canUpdate || creating || !detail}
                      onClick={() => {
                        secretForm.resetFields();
                        setSecretOpen(true);
                      }}
                    >
                      {detail?.hasSecret ? '更换密钥' : '录入密钥'}
                    </Button>
                    <Typography.Paragraph type="secondary" style={{ marginTop: 12, fontSize: 12 }}>
                      密钥使用服务端密钥材料加密后存储，接口不返回明文与密文；历史保留最近三次，可回滚。
                    </Typography.Paragraph>
                  </>
                ),
              },
              {
                key: 'tasks',
                label: '同步任务',
                children: creating ? (
                  <Empty description="创建端点后可关联同步任务" />
                ) : (
                  <Table rowKey="taskCode" size="small" dataSource={tasks} columns={taskColumns} pagination={false} />
                ),
              },
            ]}
          />
        </Form>

        {detail && !creating && (
          <Descriptions
            size="small"
            column={2}
            style={{ marginTop: 16 }}
            items={[
              { key: 'health', label: '健康状态', children: healthMeta(detail.healthStatus).text },
              { key: 'check', label: '最近检查', children: formatDateTime(detail.lastCheckTime) },
              { key: 'msg', label: '检查结果', children: detail.lastCheckMessage || '-' },
              { key: 'history', label: '密钥历史', children: `${detail.secretHistoryCount} 条` },
            ]}
          />
        )}
      </Drawer>

      <Modal
        title="更换密钥"
        open={secretOpen}
        onCancel={() => setSecretOpen(false)}
        onOk={handleSecret}
        okText="保存"
        destroyOnClose
      >
        <Form form={secretForm} layout="vertical" autoComplete="off">
          <Form.Item name="Secret" label="新密钥" rules={[{ required: true, message: '请输入新密钥' }]}>
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            name="Secret_Confirm"
            label="确认新密钥"
            dependencies={['Secret']}
            rules={[
              { required: true, message: '请再次输入' },
              ({ getFieldValue }) => ({
                validator: (_rule, value) =>
                  value === getFieldValue('Secret') ? Promise.resolve() : Promise.reject(new Error('两次输入不一致')),
              }),
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item name="Reason" label="变更原因" rules={[{ required: true, message: '请填写变更原因' }]}>
            <Input placeholder="如：第三方密钥到期轮换" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
