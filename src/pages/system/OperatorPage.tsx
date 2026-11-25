import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  App,
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Radio,
  Select,
  Space,
  Table,
  TreeSelect,
} from 'antd';
import { KeyOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { usePermission } from '@/hooks/usePermission';
import type { Operator } from '@/types/system';
import {
  buildDepartmentTreeSelect,
  formatDateTime,
  operatorStatusLabel,
  operatorTypeLabel,
} from './shared';
import {
  createOperator,
  deleteOperator,
  fetchDepartmentTree,
  fetchOperator,
  fetchOperators,
  fetchRoles,
  resetOperatorPassword,
  restoreOperator,
  unlockOperator,
  updateOperator,
} from '@/services/system';
interface OperatorFormValues {
  User_No: string;
  User_Name: string;
  Role_No: string;
  Dept_ID?: number | null;
  Password?: string;
  Remark?: string;
}

/** 操作员管理：左侧部门树 + 右侧操作员列表 */
export default function OperatorPage() {
  const { message } = App.useApp();
  const { has } = usePermission();
  const [departmentNodes, setDepartmentNodes] = useState<Awaited<ReturnType<typeof fetchDepartmentTree>>>([]);
  const [roles, setRoles] = useState<Awaited<ReturnType<typeof fetchRoles>>>([]);
  const [rows, setRows] = useState<Operator[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [deptId, setDeptId] = useState<number | undefined>();
  const [statusFilter, setStatusFilter] = useState<string>('normal');  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Operator | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<OperatorFormValues>();

  const loadList = useCallback(() => {
    setLoading(true);
    fetchOperators({ keyword, deptId, status: statusFilter, page, pageSize })
      .then((result) => {
        setRows(result.items);
        setTotal(result.total);
      })
      .catch(() => {
        setRows([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [keyword, deptId, statusFilter, page, pageSize]);

  useEffect(() => {
    fetchDepartmentTree(true)
      .then(setDepartmentNodes)
      .catch(() => setDepartmentNodes([]));
    fetchRoles()
      .then(setRoles)
      .catch(() => setRoles([]));
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const treeSelectData = useMemo(() => buildDepartmentTreeSelect(departmentNodes), [departmentNodes]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ Role_No: roles[0]?.roleNo ?? '', Dept_ID: null });
    setModalOpen(true);
  };

  const openEdit = async (record: Operator) => {
    setEditing(record);
    form.resetFields();
    setModalOpen(true);
    try {
      const detail = await fetchOperator(record.userNo);
      form.setFieldsValue({
        User_No: detail.userNo,
        User_Name: detail.userName,
        Role_No: detail.roleNo ?? '',
        Dept_ID: detail.deptId ?? null,
        Remark: detail.remark ?? '',
      });
    } catch {
      form.setFieldsValue({
        User_No: record.userNo,
        User_Name: record.userName,
        Role_No: record.roleNo ?? '',
        Dept_ID: record.deptId ?? null,
        Remark: record.remark ?? '',
      });
    }
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      if (editing) {
        await updateOperator(editing.userNo, { ...values });
        message.success('操作员已更新');
      } else {
        await createOperator({ ...values });
        message.success('操作员已创建');
      }
      setModalOpen(false);
      loadList();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (record: Operator) => {
    try {
      const result = await resetOperatorPassword(record.userNo);
      Modal.success({
        title: '密码已重置',
        content: `临时密码：${result.tempPassword}，该账号下次登录需修改密码。`,
      });
      loadList();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '重置失败');
    }
  };

  const handleUnlock = async (record: Operator) => {
    try {
      await unlockOperator(record.userNo);
      message.success('账号已解锁');
      loadList();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '解锁失败');
    }
  };

  const handleDelete = async (record: Operator) => {
    try {
      await deleteOperator(record.userNo);
      message.success('操作员已注销');
      loadList();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '注销失败');
    }
  };

  const handleRestore = async (record: Operator) => {
    try {
      await restoreOperator(record.userNo);
      message.success('操作员已恢复');
      loadList();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '恢复失败');
    }
  };

  const columns = [
    { title: '编号', dataIndex: 'userNo', key: 'userNo', width: 110 },
    { title: '姓名', dataIndex: 'userName', key: 'userName', width: 110 },
    { title: '角色', dataIndex: 'roleName', key: 'roleName', width: 130, render: (v: string | null) => v ?? '-' },
    { title: '部门', dataIndex: 'deptName', key: 'deptName', width: 150, render: (v: string | null) => v ?? '-' },
    { title: '类型', dataIndex: 'userType', key: 'userType', width: 100, render: (v: number | null) => operatorTypeLabel(v) },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_: unknown, record: Operator) => operatorStatusLabel(record),
    },
    {
      title: '最近登录',
      dataIndex: 'recentLogin',
      key: 'recentLogin',
      width: 150,
      render: (v: string | null) => formatDateTime(v),
    },
    {
      title: '操作',
      key: 'actions',
      width: 300,
      render: (_: unknown, record: Operator) => {
        const deleted = record.status === 'deleted';
        return (
          <Space size="small" wrap>
            {has('system:operator:update') && !deleted && (
              <Button type="link" size="small" onClick={() => openEdit(record)}>
                编辑
              </Button>
            )}
            {has('system:operator:resetPwd') && !deleted && (
              <Button type="link" size="small" icon={<KeyOutlined />} onClick={() => handleResetPassword(record)}>
                重置密码
              </Button>
            )}
            {has('system:operator:update') && !deleted && (
              <Button type="link" size="small" onClick={() => handleUnlock(record)}>
                解锁
              </Button>
            )}
            {has('system:operator:delete') && !deleted && record.userNo !== 'Admin' && (
              <Popconfirm title="确认注销该操作员？注销后权限将被清理。" onConfirm={() => handleDelete(record)}>
                <Button type="link" size="small" danger>
                  注销
                </Button>
              </Popconfirm>
            )}
            {deleted && has('system:operator:delete') && (
              <Button type="link" size="small" onClick={() => handleRestore(record)}>
                恢复
              </Button>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div className="system-page">
      <aside className="system-context-card ant-card ant-card-bordered">
        <div className="ant-card-body">
          <h3 className="system-context-title">组织结构</h3>
          <TreeSelect
            style={{ width: '100%' }}
            treeData={treeSelectData}
            treeDefaultExpandAll
            allowClear
            value={deptId}
            placeholder="按部门筛选"
            onChange={(value) => {
              setPage(1);
              setDeptId(value ?? undefined);
            }}
          />
          <p className="system-context-tip">共 {departmentNodes.length} 个部门</p>
        </div>
      </aside>

      <section className="system-workspace">
        <div className="system-toolbar">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            style={{ width: 240 }}
            placeholder="搜索编号 / 姓名"
            value={keyword}
            onChange={(event) => {
              setPage(1);
              setKeyword(event.target.value);
            }}
          />
          <Radio.Group
            value={statusFilter}
            onChange={(event) => {
              setPage(1);
              setStatusFilter(event.target.value);
            }}
            options={[
              { label: '正常', value: 'normal' },
              { label: '已注销', value: 'deleted' },
              { label: '全部', value: 'all' },
            ]}
            optionType="button"
            buttonStyle="solid"
          />
          <span style={{ flex: 1 }} />
          <Button icon={<ReloadOutlined />} onClick={loadList}>
            刷新
          </Button>
          {has('system:operator:create') && (
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新增操作员
            </Button>
          )}
        </div>

        <Table
          rowKey="userNo"
          size="middle"
          loading={loading}
          columns={columns}
          dataSource={rows}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 名操作员`,
            onChange: (p, s) => {
              setPage(p);
              setPageSize(s);
            },
          }}
        />
      </section>

      <Modal
        title={editing ? `编辑操作员：${editing.userName}` : '新增操作员'}
        open={modalOpen}
        onOk={handleSave}
        confirmLoading={saving}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
        width={520}
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            name="User_No"
            label="操作员编号"
            rules={[{ required: true, message: '请输入操作员编号' }, { pattern: /^\S{2,20}$/, message: '编号为 2-20 个非空白字符' }]}
          >
            <Input maxLength={20} disabled={Boolean(editing)} placeholder="登录账号，创建后不可修改" />
          </Form.Item>
          <Form.Item name="User_Name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input maxLength={30} />
          </Form.Item>
          <Form.Item name="Role_No" label="角色" rules={[{ required: true, message: '请选择角色' }]}>
            <Select
              options={roles.map((role) => ({ value: role.roleNo, label: `${role.roleName} (${role.roleNo})` }))}
              placeholder="选择角色"
            />
          </Form.Item>
          <Form.Item
            name="Dept_ID"
            label="所属部门"
            rules={[{ required: true, message: '请选择所属部门' }]}
          >
            <TreeSelect
              treeData={treeSelectData}
              treeDefaultExpandAll
              allowClear
              treeLine
              placeholder="选择部门（必选）"
            />
          </Form.Item>
          {!editing && (
            <Form.Item
              name="Password"
              label="初始密码"
              rules={[
                { required: true, message: '请输入初始密码' },
                {
                  pattern: /^(?=.*[A-Za-z])(?=.*\d).{8,20}$/,
                  message: '8-20 位，需同时包含字母和数字',
                },
              ]}
            >
              <Input.Password maxLength={20} placeholder="8-20 位，包含字母和数字" />
            </Form.Item>
          )}
          <Form.Item name="Remark" label="备注">
            <Input.TextArea rows={2} maxLength={200} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
