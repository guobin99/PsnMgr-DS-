import { useCallback, useEffect, useState } from 'react';
import { App, Alert, Button, Empty, Input, Modal, Space, Switch, Table, Tag } from 'antd';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { usePermission } from '@/hooks/usePermission';
import type { CashierAuth, Device } from '@/types/system';
import { fetchCashierAuth, fetchCashierAuths, fetchCashierDevices, saveCashierAuth } from '@/services/system';

interface CashierForm {
  isCashier: boolean;
  cardNo: string;
  mocNos: string[];
}

/** 出纳授权管理：列表 + 编辑（卡号、出纳机、同步 User_Moc） */
export default function CashierAuthPage() {
  const { message } = App.useApp();
  const { has } = usePermission();
  const [rows, setRows] = useState<CashierAuth[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [onlyCashier, setOnlyCashier] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [editOpen, setEditOpen] = useState(false);
  const [editUserNo, setEditUserNo] = useState('');
  const [editUserName, setEditUserName] = useState('');
  const [devices, setDevices] = useState<Device[]>([]);
  const [form, setForm] = useState<CashierForm>({ isCashier: false, cardNo: '', mocNos: [] });
  const [saving, setSaving] = useState(false);

  const loadList = useCallback(() => {
    setLoading(true);
    fetchCashierAuths({ keyword, onlyCashier, page, pageSize })
      .then((result) => {
        setRows(result.items);
        setTotal(result.total);
      })
      .catch(() => {
        setRows([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [keyword, onlyCashier, page, pageSize]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const openEdit = async (record: CashierAuth) => {
    setEditUserNo(record.userNo);
    setEditUserName(record.userName);
    setEditOpen(true);
    setForm({ isCashier: record.isCashier, cardNo: record.cardNo ?? '', mocNos: [] });
    try {
      const [detail, deviceList] = await Promise.all([
        fetchCashierAuth(record.userNo),
        fetchCashierDevices(),
      ]);
      setDevices(deviceList);
      setForm({
        isCashier: detail.isCashier,
        cardNo: detail.cardNo ?? '',
        mocNos: detail.mocNos ?? [],
      });
    } catch {
      setDevices([]);
    }
  };

  const toggleDevice = (mocNo: string, checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      mocNos: checked ? [...new Set([...prev.mocNos, mocNo])] : prev.mocNos.filter((no) => no !== mocNo),
    }));
  };

  const handleSave = async () => {
    if (form.isCashier) {
      if (form.cardNo && !/^\d{1,12}$/.test(form.cardNo)) {
        message.warning('出纳卡号必须是 1-12 位数字');
        return;
      }
      if (form.mocNos.length === 0) {
        message.warning('出纳员至少需授权一台出纳机');
        return;
      }
    }
    setSaving(true);
    try {
      await saveCashierAuth(editUserNo, {
        Is_Cashier: form.isCashier,
        Card_No: form.isCashier ? form.cardNo : undefined,
        Moc_Nos: form.isCashier ? form.mocNos : [],
      });
      message.success('出纳授权已保存');
      setEditOpen(false);
      loadList();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { title: '编号', dataIndex: 'userNo', key: 'userNo', width: 120 },
    { title: '姓名', dataIndex: 'userName', key: 'userName', width: 120 },
    {
      title: '出纳身份',
      dataIndex: 'isCashier',
      key: 'isCashier',
      width: 100,
      render: (v: boolean) => (v ? <Tag color="gold">出纳员</Tag> : <Tag>普通</Tag>),
    },
    { title: '出纳卡号', dataIndex: 'cardNo', key: 'cardNo', width: 140, render: (v: string | null) => v ?? '-' },
    { title: '授权机台数', dataIndex: 'mocCount', key: 'mocCount', width: 110 },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (v: string) => (v === 'deleted' ? <Tag color="default">已注销</Tag> : <Tag color="green">正常</Tag>),
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: CashierAuth) =>
        has('system:cashierAuth:assign') && record.status !== 'deleted' ? (
          <Button type="link" size="small" onClick={() => openEdit(record)}>
            配置授权
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="system-page system-page-single">
      <section className="system-workspace">
        <div className="system-toolbar">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            style={{ width: 220 }}
            placeholder="搜索编号 / 姓名"
            value={keyword}
            onChange={(event) => {
              setPage(1);
              setKeyword(event.target.value);
            }}
          />
          <Space>
            <span>仅看出纳员</span>
            <Switch
              checked={onlyCashier}
              onChange={(checked) => {
                setPage(1);
                setOnlyCashier(checked);
              }}
            />
          </Space>
          <span style={{ flex: 1 }} />
          <Button icon={<ReloadOutlined />} onClick={loadList}>
            刷新
          </Button>
        </div>

        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="BS 端仅维护出纳授权数据，不执行物理写卡；授权后由 CS 端完成卡片下发。"
        />

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
        title={`出纳授权：${editUserName}（${editUserNo}）`}
        open={editOpen}
        onOk={handleSave}
        confirmLoading={saving}
        onCancel={() => setEditOpen(false)}
        width={560}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Space>
            <span>设为出纳员：</span>
            <Switch
              checked={form.isCashier}
              onChange={(checked) => setForm((prev) => ({ ...prev, isCashier: checked }))}
            />
          </Space>

          {form.isCashier && (
            <>
              <div>
                <span style={{ display: 'block', marginBottom: 4 }}>出纳卡号（1-12 位数字）</span>
                <Input
                  style={{ width: 240 }}
                  maxLength={12}
                  value={form.cardNo}
                  placeholder="刷卡或输入卡号"
                  onChange={(event) => setForm((prev) => ({ ...prev, cardNo: event.target.value.replace(/\D/g, '') }))}
                />
              </div>

              <div>
                <span style={{ display: 'block', marginBottom: 4 }}>授权出纳机（SF / LH 子系统设备）</span>
                {devices.length === 0 ? (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无可授权的出纳机" />
                ) : (
                  <div className="system-scope-card">
                    {devices.map((device) => (
                      <label key={device.mocNo} className="system-subsystem-option">
                        <input
                          type="checkbox"
                          checked={form.mocNos.includes(device.mocNo)}
                          onChange={(event) => toggleDevice(device.mocNo, event.target.checked)}
                        />
                        <span>
                          {device.mocNo} - {device.mocName}（{device.systemNo}）
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </Space>
      </Modal>
    </div>
  );
}
