import { useCallback, useState } from 'react';import { App, Alert, Button, Checkbox, Descriptions, Empty, Spin } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { usePermission } from '@/hooks/usePermission';
import type { Operator, SubsystemOption } from '@/types/system';
import { OperatorContextList } from './shared';
import { fetchSubsystemOptions, fetchSubsystemRights, saveSubsystemRights } from '@/services/system';

/** 子系统权限：左侧操作员 + 右侧子系统勾选（人员级 ST_SubSysRight 只读） */
export default function SubsystemRightPage() {
  const { message } = App.useApp();
  const { has } = usePermission();
  const [selected, setSelected] = useState<Operator | null>(null);
  const [options, setOptions] = useState<SubsystemOption[]>([]);
  const [checkedNos, setCheckedNos] = useState<string[]>([]);
  const [unrestricted, setUnrestricted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadDetail = useCallback((userNo: string) => {
    setLoading(true);
    fetchSubsystemRights(userNo)
      .then((result) => {
        setCheckedNos(result.systemNos ?? []);
        setUnrestricted(Boolean(result.unrestricted));
      })
      .catch(() => {
        setCheckedNos([]);
        setUnrestricted(false);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = (operator: Operator) => {
    setSelected(operator);
    setOptions([]);
    setUnrestricted(false);
    fetchSubsystemOptions(operator.roleNo ?? undefined)
      .then(setOptions)
      .catch(() => setOptions([]));
    loadDetail(operator.userNo);
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await saveSubsystemRights(selected.userNo, checkedNos);
      message.success('子系统权限已保存');
      loadDetail(selected.userNo);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="system-page">
      <OperatorContextList selectedUserNo={selected?.userNo} onSelect={handleSelect} title="操作员" />

      <section className="system-workspace">
        {selected ? (
          <Spin spinning={loading}>
            <div className="system-selected-summary">
              <strong>{selected.userName}</strong>
              <span>
                {selected.userNo}
                {selected.roleName ? ` · ${selected.roleName}` : ''}
              </span>
            </div>

            {unrestricted && (
              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 12 }}
                message="该账号为 Admin 或内置管理员角色，默认拥有全部子系统访问权限。"
              />
            )}

            {options.length === 0 ? (
              <Empty description="当前角色未配置任何子系统菜单" style={{ marginTop: 60 }} />
            ) : (
              <div className="system-scope-card">
                {options.map((option) => (
                  <label key={option.systemNo} className="system-subsystem-option">
                    <Checkbox
                      checked={checkedNos.includes(option.systemNo)}
                      disabled={!has('system:subsystemRight:assign')}
                      onChange={(event) => {
                        const no = option.systemNo;
                        setCheckedNos((prev) =>
                          event.target.checked ? [...prev, no] : prev.filter((item) => item !== no),
                        );
                      }}
                    >
                      {option.systemName}（{option.systemNo}）
                    </Checkbox>
                    <span className="system-subsystem-meta">角色菜单 {option.roleMenuCount} 项</span>
                  </label>
                ))}
              </div>
            )}

            <Descriptions
              size="small"
              column={1}
              style={{ marginTop: 12 }}
              items={[
                {
                  key: 'action',
                  label: '操作',
                  children: (
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      loading={saving}
                      disabled={!has('system:subsystemRight:assign')}
                      onClick={handleSave}
                    >
                      保存
                    </Button>
                  ),
                },
              ]}
            />
          </Spin>
        ) : (
          <Empty description="请在左侧选择操作员" style={{ marginTop: 80 }} />
        )}
      </section>
    </div>
  );
}
