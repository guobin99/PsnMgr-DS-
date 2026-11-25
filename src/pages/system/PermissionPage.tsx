import { useCallback, useEffect, useMemo, useState, type Key } from 'react';
import { App, Button, Checkbox, Empty, Input, Segmented, Select, Space, Spin, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined, SaveOutlined, SearchOutlined, UndoOutlined } from '@ant-design/icons';
import { usePermission } from '@/hooks/usePermission';
import type { MenuRight, MenuTreeNode, Role, RoleRightItem } from '@/types/system';
import { fetchMenuTree, fetchRoleRights, fetchRoles, fetchSubsystems, saveRoleRights } from '@/services/system';

/**
 * 菜单与操作权限（权限矩阵）
 *
 * 行是菜单，列是权限位，一屏同时看到全部菜单与全部权限位，避免「点菜单 → 看右侧 → 改 → 再点下一个」的串行操作。
 * 三条与 CS 结构对齐的硬规则：
 * 1. 列集合是所有菜单 ST_RightInfo.Right_Values 的并集，不受单个菜单功能多少影响；ST_RightValue.Right_ID 为 char(1)，全库最多十列。
 * 2. ST_RightValue 主键是 (Right_ID, Form_Name)，同一编号在不同菜单下含义不同（位 1 在人员档案是增加、在 IC 卡挂失是挂失），
 *    所以单元格显示该菜单自己的 Right_Name，列头只放位号或通用类别。
 * 3. 单元格可用性由该菜单的 Right_Values 决定，不支持的位显示「—」并禁用，批量操作只作用于支持该位的菜单。
 */

type ViewMode = 'all' | 'granted' | 'changed';

interface MatrixRow extends MenuTreeNode {
  children?: MatrixRow[];
  rights: MenuRight[];
  rightValues: string;
}

/** BS 自有页面的七个位语义统一，列头可直接显示业务名；CS 历史子系统的列头只显示位号 */
const BS_RIGHT_LABELS: Record<string, string> = {
  '0': '使用',
  '1': '新增',
  '2': '修改',
  '3': '删除',
  '4': '导出',
  '5': '重置密码',
  '6': '分配权限',
};

const toSet = (list?: string[]) => new Set(list ?? []);

const isGroupRow = (row: MatrixRow) => Boolean(row.children && row.children.length > 0);

function buildMatrix(nodes: MenuTreeNode[]): MatrixRow[] {
  const map = new Map<number, MatrixRow>();
  nodes.forEach((node) => {
    map.set(node.menuId, {
      ...node,
      rights: node.rights ?? [],
      rightValues: node.rightValues ?? '',
      children: [],
    });
  });
  const roots: MatrixRow[] = [];
  nodes.forEach((node) => {
    const current = map.get(node.menuId);
    if (!current) return;
    const parent = node.parentId != null ? map.get(node.parentId) : undefined;
    if (parent) parent.children?.push(current);
    else roots.push(current);
  });
  map.forEach((row) => {
    if (row.children && row.children.length === 0) delete row.children;
  });
  return roots;
}

function flatten(rows: MatrixRow[]): MatrixRow[] {
  return rows.flatMap((row) => [row, ...(row.children ? flatten(row.children) : [])]);
}

function leafRows(rows: MatrixRow[]): MatrixRow[] {
  return rows.flatMap((row) => (isGroupRow(row) ? leafRows(row.children ?? []) : [row]));
}

/** 分组行的作用域：该分组下全部叶子菜单 */
function leavesOf(row: MatrixRow): MatrixRow[] {
  return isGroupRow(row) ? leafRows(row.children ?? []) : [row];
}

export default function PermissionPage() {
  const { message, modal } = App.useApp();
  const { has } = usePermission();
  const canAssign = has('system:permission:assign');

  const [roles, setRoles] = useState<Role[]>([]);
  const [roleNo, setRoleNo] = useState('');
  const [systemNo, setSystemNo] = useState('BS');
  const [subsystems, setSubsystems] = useState<Awaited<ReturnType<typeof fetchSubsystems>>>([]);
  const [rows, setRows] = useState<MatrixRow[]>([]);
  const [saved, setSaved] = useState<Record<number, string[]>>({});
  const [checked, setChecked] = useState<Record<number, string[]>>({});
  const [expandedKeys, setExpandedKeys] = useState<readonly Key[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [view, setView] = useState<ViewMode>('all');

  useEffect(() => {
    fetchRoles()
      .then((list) => {
        setRoles(list);
        if (list.length > 0) setRoleNo((current) => current || list[0].roleNo);
      })
      .catch(() => setRoles([]));
    fetchSubsystems()
      .then(setSubsystems)
      .catch(() => setSubsystems([]));
  }, []);

  const loadMenus = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchMenuTree(systemNo);
      const tree = buildMatrix(list);
      setRows(tree);
      setExpandedKeys(flatten(tree).filter(isGroupRow).map((row) => row.menuId));
    } catch {
      setRows([]);
      setExpandedKeys([]);
    } finally {
      setLoading(false);
    }
  }, [systemNo]);

  const loadRights = useCallback(async () => {
    if (!roleNo) {
      setSaved({});
      setChecked({});
      return;
    }
    try {
      const result = await fetchRoleRights(roleNo, systemNo);
      const map: Record<number, string[]> = {};
      (result.items ?? []).forEach((item: RoleRightItem) => {
        map[item.menuId] = item.rightIds ?? [];
      });
      setSaved(map);
      setChecked(map);
    } catch {
      setSaved({});
      setChecked({});
    }
  }, [roleNo, systemNo]);

  useEffect(() => {
    void loadMenus();
  }, [loadMenus]);

  useEffect(() => {
    void loadRights();
  }, [loadRights]);

  const allRows = useMemo(() => flatten(rows), [rows]);
  const leaves = useMemo(() => leafRows(rows), [rows]);
  const groupIds = useMemo(
    () => new Set(allRows.filter(isGroupRow).map((row) => row.menuId)),
    [allRows],
  );

  /** 列集合 = 全部菜单 Right_Values 的并集，数量由权限位字典决定，不随菜单功能多少增长 */
  const rightIds = useMemo(() => {
    const set = new Set<string>();
    allRows.forEach((row) => row.rights.forEach((right) => set.add(right.rightId)));
    return Array.from(set).sort();
  }, [allRows]);

  const columnLabel = useCallback(
    (rightId: string) => (systemNo === 'BS' ? BS_RIGHT_LABELS[rightId] ?? `位${rightId}` : `位${rightId}`),
    [systemNo],
  );

  const diffOf = useCallback(
    (menuId: number) => {
      const now = toSet(checked[menuId]);
      const before = toSet(saved[menuId]);
      let count = 0;
      now.forEach((id) => {
        if (!before.has(id)) count += 1;
      });
      before.forEach((id) => {
        if (!now.has(id)) count += 1;
      });
      return count;
    },
    [checked, saved],
  );

  const grantedCount = useMemo(
    () => leaves.reduce((sum, row) => sum + (checked[row.menuId]?.length ?? 0), 0),
    [leaves, checked],
  );
  const changedCount = useMemo(
    () => leaves.reduce((sum, row) => sum + diffOf(row.menuId), 0),
    [leaves, diffOf],
  );
  const dirty = changedCount > 0;

  const visibleRows = useMemo(() => {
    const keywordHit = (row: MatrixRow) => !keyword || row.menuName.includes(keyword) || row.menuNo.includes(keyword);
    const viewHit = (row: MatrixRow) => {
      if (view === 'all') return true;
      if (view === 'granted') return (checked[row.menuId]?.length ?? 0) > 0;
      return diffOf(row.menuId) > 0;
    };
    const walk = (list: MatrixRow[]): MatrixRow[] =>
      list.flatMap((row) => {
        if (isGroupRow(row)) {
          const kids = walk(row.children ?? []);
          if (kids.length > 0) return [{ ...row, children: kids }];
          if (view === 'all' && keywordHit(row)) return [{ ...row, children: row.children }];
          return [];
        }
        return keywordHit(row) && viewHit(row) ? [row] : [];
      });
    return walk(rows);
  }, [rows, keyword, view, checked, diffOf]);

  const selectedRole = roles.find((role) => role.roleNo === roleNo);
  const readOnly = Boolean(selectedRole?.builtIn) || !canAssign;
  const disabledEdit = readOnly || !roleNo;

  /** 分组行的三态：聚合其下支持该位的叶子菜单，用于整组批量授权 */
  const aggregate = (row: MatrixRow, rightId: string) => {
    const targets = leavesOf(row).filter((item) => item.rights.some((right) => right.rightId === rightId));
    if (targets.length === 0) return null;
    const on = targets.filter((item) => (checked[item.menuId] ?? []).includes(rightId)).length;
    return { total: targets.length, on };
  };

  const applyRight = (targets: MatrixRow[], rightId: string, next: boolean) => {
    setChecked((prev) => {
      const copy = { ...prev };
      targets.forEach((target) => {
        const set = new Set(copy[target.menuId] ?? []);
        if (next) set.add(rightId);
        else set.delete(rightId);
        copy[target.menuId] = Array.from(set);
      });
      return copy;
    });
  };

  const toggleGroupCell = (row: MatrixRow, rightId: string, next: boolean) => {
    const targets = leavesOf(row).filter((item) => item.rights.some((right) => right.rightId === rightId));
    applyRight(targets, rightId, next);
  };

  const toggleLeafCell = (menuId: number, rightId: string, next: boolean) => {
    setChecked((prev) => {
      const set = new Set(prev[menuId] ?? []);
      if (next) set.add(rightId);
      else set.delete(rightId);
      return { ...prev, [menuId]: Array.from(set) };
    });
  };

  const handleSelectAll = () => {
    setChecked((prev) => {
      const copy = { ...prev };
      leaves.forEach((row) => {
        copy[row.menuId] = row.rights.map((right) => right.rightId);
      });
      return copy;
    });
  };

  const handleClear = () => {
    setChecked((prev) => {
      const copy = { ...prev };
      leaves.forEach((row) => {
        copy[row.menuId] = [];
      });
      return copy;
    });
  };

  const handleReset = () => setChecked({ ...saved });

  const handleSave = () => {
    if (!dirty || !roleNo) return;
    let added = 0;
    let removed = 0;
    leaves.forEach((row) => {
      const now = toSet(checked[row.menuId]);
      const before = toSet(saved[row.menuId]);
      now.forEach((id) => {
        if (!before.has(id)) added += 1;
      });
      before.forEach((id) => {
        if (!now.has(id)) removed += 1;
      });
    });

    modal.confirm({
      title: '确认保存授权',
      content: `将为角色 ${selectedRole?.roleName ?? roleNo} 新增 ${added} 项、移除 ${removed} 项授权，保存后立即生效。`,
      okText: '保存',
      cancelText: '取消',
      onOk: async () => {
        const items: RoleRightItem[] = [];
        leaves.forEach((row) => {
          const ids = checked[row.menuId] ?? [];
          if (ids.length > 0) items.push({ menuId: row.menuId, rightIds: ids });
        });
        // 分组行在矩阵中只作批量开关，不参与编辑；其原有授权原样带回去，避免整体替换时被清空
        allRows.forEach((row) => {
          if (!groupIds.has(row.menuId)) return;
          const ids = saved[row.menuId] ?? [];
          if (ids.length > 0) items.push({ menuId: row.menuId, rightIds: ids });
        });

        setSaving(true);
        try {
          const result = await saveRoleRights(roleNo, systemNo, items);
          message.success(
            `授权已保存（版本 ${result.version ?? '-'}），跳过 ${result.skippedCount ?? 0} 项无效权限`,
          );
          await loadRights();
        } catch (error) {
          message.error(error instanceof Error ? error.message : '保存失败');
        } finally {
          setSaving(false);
        }
      },
    });
  };

  useEffect(() => {
    if (!dirty) return undefined;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const renderCell = (row: MatrixRow, rightId: string) => {
    if (isGroupRow(row)) {
      const info = aggregate(row, rightId);
      if (!info) return <span className="matrix-na">—</span>;
      return (
        <Checkbox
          checked={info.on === info.total}
          indeterminate={info.on > 0 && info.on < info.total}
          disabled={disabledEdit}
          onChange={(event) => toggleGroupCell(row, rightId, event.target.checked)}
        />
      );
    }

    const right = row.rights.find((item) => item.rightId === rightId);
    if (!right) return <span className="matrix-na">—</span>;

    const isOn = (checked[row.menuId] ?? []).includes(rightId);
    const wasOn = (saved[row.menuId] ?? []).includes(rightId);
    const changed = isOn !== wasOn;
    const label = columnLabel(rightId);

    return (
      <span
        className={`matrix-cell${changed ? ' is-changed' : ''}`}
        title={right.permissionCode ? `${right.rightName} · ${right.permissionCode}` : right.rightName}
      >
        <Checkbox
          checked={isOn}
          disabled={disabledEdit}
          onChange={(event) => toggleLeafCell(row.menuId, rightId, event.target.checked)}
        />
        {right.rightName && right.rightName !== label && <span className="matrix-cell-name">{right.rightName}</span>}
      </span>
    );
  };

  const columns: ColumnsType<MatrixRow> = [
    {
      title: '菜单',
      key: 'menu',
      width: 260,
      fixed: 'left',
      render: (_: unknown, row: MatrixRow) => (
        <div className="matrix-menu-cell">
          <span className="matrix-menu-name">{row.menuName}</span>
          <span className="matrix-menu-no">{row.menuNo}</span>
        </div>
      ),
    },
    ...rightIds.map(
      (rightId): ColumnsType<MatrixRow>[number] => ({
        title: <span className="matrix-col-title">{columnLabel(rightId)}</span>,
        key: `right-${rightId}`,
        width: 104,
        align: 'center',
        render: (_: unknown, row: MatrixRow) => renderCell(row, rightId),
      }),
    ),
  ];

  return (
    <div className="system-page system-page-single">
      <section className="system-workspace">
        <div className="system-toolbar">
          <Select
            style={{ width: 220 }}
            showSearch
            optionFilterProp="label"
            placeholder="选择角色"
            value={roleNo || undefined}
            onChange={(value) => setRoleNo(value)}
            options={roles.map((role) => ({
              value: role.roleNo,
              label: `${role.roleName} (${role.roleNo})`,
            }))}
          />
          <Select
            style={{ width: 170 }}
            placeholder="子系统"
            value={systemNo}
            onChange={(value) => setSystemNo(value)}
            options={subsystems.map((item) => ({
              value: item.systemNo,
              label: `${item.systemName} (${item.systemNo})`,
            }))}
          />
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="搜索菜单名或编号"
            style={{ width: 200 }}
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
          <Segmented
            value={view}
            onChange={(value) => setView(value as ViewMode)}
            options={[
              { label: '全部', value: 'all' },
              { label: '仅看已授权', value: 'granted' },
              { label: '仅有变更', value: 'changed' },
            ]}
          />
          <span style={{ flex: 1 }} />
          <Button onClick={handleSelectAll} disabled={disabledEdit}>
            全选可分配
          </Button>
          <Button onClick={handleClear} disabled={disabledEdit}>
            清空
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              void loadMenus();
              void loadRights();
            }}
          >
            刷新
          </Button>
        </div>

        {!roleNo && <p className="system-readonly-tip">请先选择角色，矩阵在未选择角色时只读。</p>}
        {roleNo && readOnly && (
          <p className="system-readonly-tip">内置角色（如 Administrators）拥有全部权限，或当前账号无分配权限，矩阵只读。</p>
        )}

        <Spin spinning={loading}>
          <Table<MatrixRow>
            rowKey="menuId"
            size="small"
            bordered
            pagination={false}
            dataSource={visibleRows}
            columns={columns}
            scroll={{ x: 'max-content', y: 520 }}
            expandable={{
              expandedRowKeys: expandedKeys,
              onExpandedRowsChange: (keys) => setExpandedKeys(keys),
            }}
            rowClassName={(row) => (isGroupRow(row) ? 'matrix-group-row' : '')}
            locale={{
              emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前视图下没有菜单" />,
            }}
          />
        </Spin>

        <div className="matrix-footer">
          <span className="matrix-footer-text">
            已授权 <b>{grantedCount}</b> 项 · 有变更 <b>{changedCount}</b> 项
            {systemNo !== 'BS' && ' · 列头为权限位编号，格内为该菜单自己的操作名'}
          </span>
          <Space>
            <Button icon={<UndoOutlined />} disabled={!dirty || disabledEdit} onClick={handleReset}>
              撤销更改
            </Button>
            {!readOnly && (
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={saving}
                disabled={!dirty || !roleNo}
                onClick={handleSave}
              >
                保存授权
              </Button>
            )}
          </Space>
        </div>
      </section>
    </div>
  );
}
