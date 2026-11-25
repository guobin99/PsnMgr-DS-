import { useCallback, useEffect, useMemo, useState, type Key } from 'react';
import { App, Alert, Button, Descriptions, Empty, Radio, Space, Spin } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { usePermission } from '@/hooks/usePermission';
import type { DepartmentTreeNode, Operator } from '@/types/system';
import { DepartmentTreePanel, OperatorContextList } from './shared';
import { fetchDepartmentTree, fetchDeptRight, saveDeptRight } from '@/services/system';

/** 部门数据权限：左侧操作员 + 右侧数据范围配置 */
export default function DeptRightPage() {
  const { message } = App.useApp();
  const { has } = usePermission();
  const [departmentNodes, setDepartmentNodes] = useState<DepartmentTreeNode[]>([]);
  const [selected, setSelected] = useState<Operator | null>(null);
  const [scopeType, setScopeType] = useState(1);
  const [checkedKeys, setCheckedKeys] = useState<number[]>([]);
  const [coveredCount, setCoveredCount] = useState<number>(0);
  const [readonlyScope, setReadonlyScope] = useState(false);
  const [updatedTime, setUpdatedTime] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDepartmentTree(true)
      .then(setDepartmentNodes)
      .catch(() => setDepartmentNodes([]));
  }, []);

  const loadDetail = useCallback((userNo: string) => {
    setLoadingDetail(true);
    fetchDeptRight(userNo)
      .then((info) => {
        setScopeType(info.scopeType);
        setCheckedKeys(info.deptIds ?? []);
        setCoveredCount(info.coveredCount);
        setReadonlyScope(Boolean(info.readonlyScope));
        setUpdatedTime(info.updatedTime ?? null);
      })
      .catch(() => {
        setScopeType(1);
        setCheckedKeys([]);
        setCoveredCount(0);
        setReadonlyScope(false);
        setUpdatedTime(null);
      })
      .finally(() => setLoadingDetail(false));
  }, []);

  const handleSelect = (operator: Operator) => {
    setSelected(operator);
    loadDetail(operator.userNo);
  };

  const effectiveCovered = useMemo(() => {
    if (scopeType === 1) return departmentNodes.reduce((sum, node) => sum + node.personCount, 0);
    if (scopeType === 2) return coveredCount;
    // 指定部门：勾选部门人数合计（近似预览）
    return departmentNodes
      .filter((node) => checkedKeys.includes(node.deptId))
      .reduce((sum, node) => sum + node.personCount, 0);
  }, [scopeType, coveredCount, checkedKeys, departmentNodes]);

  const handleSave = async () => {
    if (!selected) return;
    if (scopeType === 3 && checkedKeys.length === 0) {
      message.warning('指定部门模式下至少勾选一个部门');
      return;
    }
    setSaving(true);
    try {
      const result = await saveDeptRight(selected.userNo, scopeType, checkedKeys);
      message.success(`已保存，覆盖 ${result.coveredCount ?? effectiveCovered} 个部门`);
      loadDetail(selected.userNo);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const disabled = readonlyScope || !has('system:deptRight:assign');

  return (
    <div className="system-page">
      <OperatorContextList selectedUserNo={selected?.userNo} onSelect={handleSelect} title="操作员" />

      <section className="system-workspace">
        {selected ? (
          <Spin spinning={loadingDetail}>
            <div className="system-selected-summary">
              <strong>{selected.userName}</strong>
              <span>
                {selected.userNo}
                {selected.roleName ? ` · ${selected.roleName}` : ''}
                {selected.deptName ? ` · ${selected.deptName}` : ''}
              </span>
            </div>

            {readonlyScope && (
              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 12 }}
                message="该账号为 Admin 或内置管理员角色，数据权限固定为全部，不可修改。"
              />
            )}

            <Radio.Group
              value={scopeType}
              disabled={disabled}
              onChange={(event) => setScopeType(event.target.value)}
              style={{ marginBottom: 12 }}
            >
              <Space direction="vertical">
                <Radio value={1}>全部数据</Radio>
                <Radio value={2}>本部门及下级部门</Radio>
                <Radio value={3}>指定部门（在下方勾选）</Radio>
              </Space>
            </Radio.Group>

            <div className="system-scope-card">
              <DepartmentTreePanel
                nodes={departmentNodes}
                checkable
                checkedKeys={checkedKeys}
                onCheck={(keys: Key[]) => setCheckedKeys(keys.map(Number))}
                disabled={disabled || scopeType !== 3}
              />
            </div>

            <Descriptions
              size="small"
              column={3}
              style={{ marginTop: 12 }}
              items={[
                { key: 'covered', label: '覆盖部门数', children: `${effectiveCovered}` },
                { key: 'updated', label: '最近更新', children: updatedTime ?? '-' },
                {
                  key: 'action',
                  label: '操作',
                  children: (
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      loading={saving}
                      disabled={disabled}
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
