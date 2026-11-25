import { useCallback, useEffect, useState } from 'react';
import { App, Button, Form, Input, Modal, Popconfirm, Space, Table, Tag } from 'antd';
import { CopyOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { usePermission } from '@/hooks/usePermission';
import type { Role } from '@/types/system';
import { copyRole, createRole, deleteRole, fetchRoleMembers, fetchRoles, updateRole } from '@/services/system';

interface RoleFormValues {
  Role_No: string;
  Role_Name: string;
  Remark?: string;
}

/** 角色管理：角色列表 + 新增 / 编辑 / 复制 / 成员查看 */
export default function RolePage() {
  const { message } = App.useApp();
  const { has } = usePermission();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [saving, setSaving] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [members, setMembers] = useState<Array<{ User_No: string; User_Name: string }>>([]);
  const [copyOpen, setCopyOpen] = useState(false);
  const [copySource, setCopySource] = useState<Role | null>(null);
  const [form] = Form.useForm<RoleFormValues>();
  const [copyForm] = Form.useForm<RoleFormValues>();

  const loadRoles = useCallback(() => {
    setLoading(true);
    fetchRoles(keyword)
      .then(setRoles)
      .catch(() => setRoles([]))
      .finally(() => setLoading(false));
  }, [keyword]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setEditOpen(true);
  };

  const openEdit = (role: Role) => {
    setEditing(role);
    form.resetFields();
    form.setFieldsValue({ Role_No: role.roleNo, Role_Name: role.roleName, Remark: role.remark ?? '' });
    setEditOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      if (editing) {
        await updateRole(editing.roleNo, { Role_Name: values.Role_Name, Remark: values.Remark });
        message.success('角色已更新');
      } else {
        await createRole(values);
        message.success('角色已创建');
      }
      setEditOpen(false);
      loadRoles();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const openCopy = (role: Role) => {
    setCopySource(role);
    copyForm.resetFields();
    copyForm.setFieldsValue({
      Role_No: `${role.roleNo}_COPY`.slice(0, 20),
      Role_Name: `${role.roleName}(副本)`,
    });
    setCopyOpen(true);
  };

  const handleCopy = async () => {
    if (!copySource) return;
    const values = await copyForm.validateFields();
    try {
      const result = await copyRole(copySource.roleNo, {
        NewRole_No: values.Role_No,
        NewRole_Name: values.Role_Name,
        Remark: values.Remark,
      });
      message.success(`角色已复制，共复制 ${result.copiedRightCount} 条授权`);
      setCopyOpen(false);
      loadRoles();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '复制失败');
    }
  };

  const openMembers = async (role: Role) => {
    setMembersOpen(true);
    setMembers([]);
    try {
      const result = await fetchRoleMembers(role.roleNo);
      setMembers(result.members ?? []);
    } catch {
      setMembers([]);
    }
  };

  const handleDelete = async (role: Role) => {
    try {
      await deleteRole(role.roleNo);
      message.success('角色已删除');
      loadRoles();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '删除失败');
    }
  };

  const columns = [
    { title: '角色编号', dataIndex: 'roleNo', key: 'roleNo', width: 140 },
    { title: '角色名称', dataIndex: 'roleName', key: 'roleName', width: 160 },
    {
      title: '内置',
      dataIndex: 'builtIn',
      key: 'builtIn',
      width: 80,
      render: (v: boolean) => (v ? <Tag color="red">内置</Tag> : <Tag>普通</Tag>),
    },
    { title: '成员数', dataIndex: 'memberCount', key: 'memberCount', width: 90 },
    { title: '权限项', dataIndex: 'permissionCount', key: 'permissionCount', width: 90 },
    { title: '备注', dataIndex: 'remark', key: 'remark', render: (v: string | null) => v ?? '-' },
    {
      title: '操作',
      key: 'actions',
      width: 280,
      render: (_: unknown, record: Role) => (
        <Space size="small">
          {has('system:role:update') && (
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
          )}
          {has('system:role:view') && (
            <Button type="link" size="small" onClick={() => openMembers(record)}>
              成员
            </Button>
          )}
          {has('system:role:copy') && !record.builtIn && (
            <Button type="link" size="small" icon={<CopyOutlined />} onClick={() => openCopy(record)}>
              复制
            </Button>
          )}
          {has('system:role:delete') && !record.builtIn && record.memberCount === 0 && (
            <Popconfirm title="确认删除该角色？将同时删除其授权记录。" onConfirm={() => handleDelete(record)}>
              <Button type="link" size="small" danger>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="system-page system-page-single">
      <section className="system-workspace">
        <div className="system-toolbar">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            style={{ width: 240 }}
            placeholder="搜索角色编号 / 名称"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
          <span style={{ flex: 1 }} />
          <Button icon={<ReloadOutlined />} onClick={loadRoles}>
            刷新
          </Button>
          {has('system:role:create') && (
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新增角色
            </Button>
          )}
        </div>

        <Table
          rowKey="roleNo"
          size="middle"
          loading={loading}
          columns={columns}
          dataSource={roles}
          pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 个角色` }}
        />
      </section>

      <Modal
        title={editing ? `编辑角色：${editing.roleName}` : '新增角色'}
        open={editOpen}
        onOk={handleSave}
        confirmLoading={saving}
        onCancel={() => setEditOpen(false)}
        destroyOnClose
        width={480}
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            name="Role_No"
            label="角色编号"
            rules={[{ required: true, message: '请输入角色编号' }, { pattern: /^\S{2,20}$/, message: '编号为 2-20 个非空白字符' }]}
          >
            <Input maxLength={20} disabled={Boolean(editing)} placeholder="创建后不可修改" />
          </Form.Item>
          <Form.Item name="Role_Name" label="角色名称" rules={[{ required: true, message: '请输入角色名称' }]}>
            <Input maxLength={30} />
          </Form.Item>
          <Form.Item name="Remark" label="备注">
            <Input.TextArea rows={2} maxLength={200} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`复制角色：${copySource?.roleName ?? ''}`}
        open={copyOpen}
        onOk={handleCopy}
        onCancel={() => setCopyOpen(false)}
        destroyOnClose
        width={480}
      >
        <Form form={copyForm} layout="vertical" preserve={false}>
          <Form.Item name="Role_No" label="新角色编号" rules={[{ required: true, message: '请输入新角色编号' }]}>
            <Input maxLength={20} />
          </Form.Item>
          <Form.Item name="Role_Name" label="新角色名称" rules={[{ required: true, message: '请输入新角色名称' }]}>
            <Input maxLength={30} />
          </Form.Item>
          <Form.Item name="Remark" label="备注">
            <Input.TextArea rows={2} maxLength={200} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="角色成员"
        open={membersOpen}
        footer={null}
        onCancel={() => setMembersOpen(false)}
        width={480}
      >
        {members.length === 0 ? (
          <p>该角色暂无成员。</p>
        ) : (
          <Table
            rowKey="User_No"
            size="small"
            pagination={false}
            dataSource={members}
            columns={[
              { title: '编号', dataIndex: 'User_No', key: 'User_No' },
              { title: '姓名', dataIndex: 'User_Name', key: 'User_Name' },
            ]}
          />
        )}
      </Modal>
    </div>
  );
}
