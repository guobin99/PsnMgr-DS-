import { useCallback, useEffect, useMemo, useState } from 'react';
import { App, Alert, Button, Descriptions, Empty, Input, Select, Table, Tag } from 'antd';
import { SaveOutlined, SearchOutlined } from '@ant-design/icons';
import { usePermission } from '@/hooks/usePermission';
import type { Device, DeviceRightItem, Operator } from '@/types/system';
import { OperatorContextList } from './shared';
import { fetchDeviceRights, fetchDevices, saveDeviceRights } from '@/services/system';

/** 设备权限：左侧操作员 + 右侧设备授权列表 */
export default function DeviceRightPage() {
  const { message } = App.useApp();
  const { has } = usePermission();
  const [selected, setSelected] = useState<Operator | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [checkedNos, setCheckedNos] = useState<string[]>([]);
  const [isCashier, setIsCashier] = useState(false);
  const [userMoc, setUserMoc] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [systemFilter, setSystemFilter] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadDevices = useCallback(() => {
    setLoading(true);
    fetchDevices({ keyword, systemNo: systemFilter, page: 1, pageSize: 500 })
      .then((result) => setDevices(result.items))
      .catch(() => setDevices([]))
      .finally(() => setLoading(false));
  }, [keyword, systemFilter]);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  const loadDetail = useCallback((userNo: string) => {
    fetchDeviceRights(userNo)
      .then((result) => {
        setCheckedNos((result.items ?? []).map((item: DeviceRightItem) => item.mocNo));
        setIsCashier(Boolean(result.isCashier));
        setUserMoc(result.userMoc ?? null);
      })
      .catch(() => {
        setCheckedNos([]);
        setIsCashier(false);
        setUserMoc(null);
      });
  }, []);

  const handleSelect = (operator: Operator) => {
    setSelected(operator);
    loadDetail(operator.userNo);
  };

  const systemOptions = useMemo(() => {
    const set = new Map<string, string>();
    devices.forEach((device) => set.set(device.systemNo, device.systemNo));
    return Array.from(set.entries()).map(([value, label]) => ({ value, label }));
  }, [devices]);

  const filtered = useMemo(
    () =>
      devices.filter(
        (device) =>
          (!systemFilter || device.systemNo === systemFilter) &&
          (!keyword ||
            device.mocNo.includes(keyword) ||
            (device.mocName ?? '').includes(keyword)),
      ),
    [devices, systemFilter, keyword],
  );

  const allChecked = filtered.length > 0 && filtered.every((device) => checkedNos.includes(device.mocNo));

  const toggle = (mocNo: string, checked: boolean) => {
    setCheckedNos((prev) => (checked ? [...new Set([...prev, mocNo])] : prev.filter((no) => no !== mocNo)));
  };

  const toggleAll = () => {
    if (allChecked) {
      const removeSet = new Set(filtered.map((device) => device.mocNo));
      setCheckedNos((prev) => prev.filter((no) => !removeSet.has(no)));
    } else {
      setCheckedNos((prev) => Array.from(new Set([...prev, ...filtered.map((device) => device.mocNo)])));
    }
  };

  const handleSave = async () => {
    if (!selected) return;
    if (isCashier && checkedNos.length === 0) {
      message.warning('出纳员至少需授权一台设备');
      return;
    }
    setSaving(true);
    try {
      const result = await saveDeviceRights(
        selected.userNo,
        checkedNos.map((mocNo) => ({ mocNo, rightLevel: 1 })),
      );
      message.success(`设备权限已保存，共 ${result.savedCount ?? checkedNos.length} 台`);
      loadDetail(selected.userNo);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      title: '选择',
      key: 'checked',
      width: 60,
      render: (_: unknown, record: Device) => (
        <input
          type="checkbox"
          checked={checkedNos.includes(record.mocNo)}
          disabled={!has('system:deviceRight:assign')}
          onChange={(event) => toggle(record.mocNo, event.target.checked)}
        />
      ),
    },
    { title: '设备号', dataIndex: 'mocNo', key: 'mocNo', width: 120 },
    { title: '设备名称', dataIndex: 'mocName', key: 'mocName' },
    { title: '子系统', dataIndex: 'systemNo', key: 'systemNo', width: 80, render: (v: string) => <Tag>{v}</Tag> },
    { title: '区域', dataIndex: 'areaNo', key: 'areaNo', width: 100, render: (v: string | null) => v ?? '-' },
  ];

  return (
    <div className="system-page">
      <OperatorContextList selectedUserNo={selected?.userNo} onSelect={handleSelect} title="操作员" />

      <section className="system-workspace">
        {selected ? (
          <>
            <div className="system-selected-summary">
              <strong>{selected.userName}</strong>
              <span>
                {selected.userNo}
                {selected.roleName ? ` · ${selected.roleName}` : ''}
              </span>
            </div>

            {isCashier && (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 12 }}
                message="该账号为出纳员，设备权限将同步写入 CS 出纳机串（User_Moc），保存时必须至少授权一台设备。"
              />
            )}

            <div className="system-toolbar">
              <Input
                allowClear
                prefix={<SearchOutlined />}
                style={{ width: 200 }}
                placeholder="搜索设备号 / 名称"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
              />
              <Select
                style={{ width: 160 }}
                allowClear
                placeholder="按子系统筛选"
                options={systemOptions}
                value={systemFilter}
                onChange={(value) => setSystemFilter(value ?? undefined)}
              />
              <span style={{ flex: 1 }} />
              <Button onClick={toggleAll} disabled={!has('system:deviceRight:assign')}>
                {allChecked ? '取消全选' : '全选当前列表'}
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={saving}
                disabled={!has('system:deviceRight:assign')}
                onClick={handleSave}
              >
                保存
              </Button>
            </div>

            <Table
              rowKey="mocNo"
              size="middle"
              loading={loading}
              columns={columns}
              dataSource={filtered}
              pagination={{ pageSize: 15, showTotal: (t) => `共 ${t} 台设备` }}
            />

            {isCashier && (
              <Descriptions
                size="small"
                column={1}
                style={{ marginTop: 12 }}
                items={[
                  {
                    key: 'userMoc',
                    label: 'CS 出纳机串（User_Moc）',
                    children: <code>{userMoc ?? '-'}</code>,
                  },
                ]}
              />
            )}
          </>
        ) : (
          <Empty description="请在左侧选择操作员" style={{ marginTop: 80 }} />
        )}
      </section>
    </div>
  );
}
