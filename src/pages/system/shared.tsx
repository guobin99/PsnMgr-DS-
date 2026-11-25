import { useEffect, useMemo, useState, type Key, type ReactNode } from 'react';
import { Empty, Input, List, Spin, Tag, Tree } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { SearchOutlined } from '@ant-design/icons';
import { fetchOperators } from '@/services/system';
import type { DepartmentTreeNode, MenuTreeNode, Operator } from '@/types/system';

/** TreeSelect 专用节点（含 value） */
export interface TreeSelectNode {
  key: number;
  value: number;
  title: string;
  children: TreeSelectNode[];
}

/** 部门扁平数据转 AntD 树，层级由后端按 Dept_No 推导后返回。 */
export function buildDepartmentTree(
  nodes: DepartmentTreeNode[],
  countMode?: 'active',
): DataNode[] {
  const map = new Map<number, DataNode & { children: DataNode[] }>();
  nodes.forEach((node) => {
    map.set(node.deptId, {
      key: node.deptId,
      title: (
        <span>
          {node.deptName ?? '未命名部门'}
          <span style={{ marginLeft: 8, color: '#98a2b3', fontSize: 10 }}>
            {countMode === 'active' && node.activeCount != null
              ? `${node.activeCount} 人在册`
              : `${node.personCount} 人`}
          </span>
        </span>
      ),
      children: [],
    });
  });

  const roots: DataNode[] = [];
  nodes.forEach((node) => {
    const current = map.get(node.deptId);
    if (!current) return;
    const parent = node.parentId != null ? map.get(node.parentId) : undefined;
    if (parent) parent.children.push(current);
    else roots.push(current);
  });
  return roots;
}

/** 部门树转 TreeSelect 数据。 */
export function buildDepartmentTreeSelect(nodes: DepartmentTreeNode[]): TreeSelectNode[] {
  const map = new Map<number, TreeSelectNode>();
  nodes.forEach((node) => {
    map.set(node.deptId, {
      key: node.deptId,
      value: node.deptId,
      title: node.deptName ?? '未命名部门',
      children: [],
    });
  });
  const roots: TreeSelectNode[] = [];
  nodes.forEach((node) => {
    const current = map.get(node.deptId);
    if (!current) return;
    const parent = node.parentId != null ? map.get(node.parentId) : undefined;
    if (parent) parent.children.push(current);
    else roots.push(current);
  });
  return roots;
}

/** 菜单扁平数据转树节点，根节点仅作分组，不可勾选。 */
export function buildMenuTree(nodes: MenuTreeNode[], assignableOnly = false): DataNode[] {
  const map = new Map<number, DataNode & { children: DataNode[]; selectable?: boolean }>();
  nodes.forEach((node) => {
    map.set(node.menuId, {
      key: node.menuId,
      title: (
        <span>
          {node.menuName}
          <span style={{ marginLeft: 8, color: '#98a2b3', fontSize: 10 }}>{node.menuNo}</span>
        </span>
      ),
      selectable: assignableOnly ? node.assignable : true,
      children: [],
    });
  });

  const roots: DataNode[] = [];
  nodes.forEach((node) => {
    const current = map.get(node.menuId);
    if (!current) return;
    const parent = node.parentId != null ? map.get(node.parentId) : undefined;
    if (parent) parent.children.push(current);
    else roots.push(current);
  });
  return roots;
}

/** 左侧操作员上下文列表：供部门权限、设备权限、子系统权限复用。 */
export function OperatorContextList({
  selectedUserNo,
  onSelect,
  title = '操作员',
}: {
  selectedUserNo?: string;
  onSelect: (operator: Operator) => void;
  title?: string;
}) {
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Operator[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchOperators({ keyword, page: 1, pageSize: 50, status: 'normal' })
      .then((result) => {
        if (!cancelled) setRows(result.items);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [keyword]);

  return (
    <div className="system-context-card ant-card ant-card-bordered">
      <div className="ant-card-body">
        <h3 className="system-context-title">{title}</h3>
        <Input
          className="system-context-search"
          allowClear
          prefix={<SearchOutlined />}
          placeholder="搜索编号或姓名"
          onChange={(event) => setKeyword(event.target.value)}
        />
        <Spin spinning={loading}>
          <div className="system-context-list">
            {rows.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无操作员" />
            ) : (
              <List
                dataSource={rows}
                renderItem={(item) => (
                  <button
                    type="button"
                    className={`system-context-item${item.userNo === selectedUserNo ? ' is-active' : ''}`}
                    onClick={() => onSelect(item)}
                  >
                    <strong>{item.userName}</strong>
                    <span>
                      {item.userNo}
                      {item.roleName ? ` · ${item.roleName}` : ''}
                    </span>
                  </button>
                )}
              />
            )}
          </div>
        </Spin>
      </div>
    </div>
  );
}

/** 通用部门树面板。 */
export function DepartmentTreePanel({
  nodes,
  loading,
  selectedKey,
  onSelect,
  checkable,
  checkedKeys,
  onCheck,
  disabled,
  countMode,
}: {
  nodes: DepartmentTreeNode[];
  loading?: boolean;
  selectedKey?: Key | null;
  onSelect?: (selectedKeys: Key[]) => void;
  checkable?: boolean;
  checkedKeys?: Key[];
  onCheck?: (checkedKeys: Key[]) => void;
  disabled?: boolean;
  countMode?: 'active';
}) {
  const treeData = useMemo(() => buildDepartmentTree(nodes, countMode), [nodes, countMode]);
  return (
    <div className="system-tree-panel">
      <Spin spinning={Boolean(loading)}>
        {nodes.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无部门" />
        ) : (
          <Tree
            blockNode
            treeData={treeData}
            defaultExpandAll
            selectedKeys={selectedKey != null ? [selectedKey] : []}
            onSelect={onSelect}
            checkable={checkable}
            checkStrictly={checkable}
            checkedKeys={checkedKeys}
            onCheck={(checked) => {
              // checkStrictly 模式下回调参数为 { checked, halfChecked }
              const keys = Array.isArray(checked) ? checked : checked.checked;
              onCheck?.(keys);
            }}
            disabled={disabled}
          />
        )}
      </Spin>
    </div>
  );
}

export function operatorTypeLabel(userType?: number | null): ReactNode {
  if (userType === 1) return <Tag color="purple">管理员</Tag>;
  if (userType === 2) return <Tag color="gold">出纳员</Tag>;
  return <Tag>普通操作员</Tag>;
}

export function operatorStatusLabel(item: Operator): ReactNode {
  if (item.status === 'deleted') return <Tag color="default">已注销</Tag>;
  if (item.csOnline) return <Tag color="success">CS 在线</Tag>;
  return <Tag color="green">正常</Tag>;
}

export function formatDateTime(value?: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const pad = (input: number) => input.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
