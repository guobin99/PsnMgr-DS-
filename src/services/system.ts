import { api } from '@/services/http'
import type {
  CashierAuth,
  DepartmentTreeNode,
  Device,
  DeviceRightItem,
  MenuRight,
  MenuTreeNode,
  Operator,
  OperatorDetail,
  PagedResult,
  Role,
  RoleRightItem,
  SaveResult,
  Subsystem,
  SubsystemOption,
} from '@/types/system'

/* ---------------- 组织树 ---------------- */

export function fetchDepartmentTree(
  includeDisabled = false,
  countMode?: 'active',
): Promise<DepartmentTreeNode[]> {
  return api.get<DepartmentTreeNode[]>('/system/departments/tree', { includeDisabled, countMode })
}

/* ---------------- 操作员管理 ---------------- */

export interface OperatorQuery {
  keyword?: string
  roleNo?: string
  deptId?: number
  userType?: number
  status?: string
  page?: number
  pageSize?: number
}

export function fetchOperators(query: OperatorQuery): Promise<PagedResult<Operator>> {
  return api.get<PagedResult<Operator>>('/system/operators', { ...query })
}

export function fetchOperator(userNo: string): Promise<OperatorDetail> {
  return api.get<OperatorDetail>(`/system/operators/${encodeURIComponent(userNo)}`)
}

export function createOperator(data: object): Promise<{ userNo: string }> {
  return api.post<{ userNo: string }>('/system/operators', data)
}

export function updateOperator(userNo: string, data: object): Promise<{ userNo: string }> {
  return api.put<{ userNo: string }>(`/system/operators/${encodeURIComponent(userNo)}`, data)
}

export function deleteOperator(userNo: string): Promise<{ userNo: string }> {
  return api.del<{ userNo: string }>(`/system/operators/${encodeURIComponent(userNo)}`)
}

export function restoreOperator(userNo: string): Promise<{ userNo: string }> {
  return api.post<{ userNo: string }>(`/system/operators/${encodeURIComponent(userNo)}/restore`)
}

export function resetOperatorPassword(userNo: string): Promise<{ userNo: string; tempPassword: string }> {
  return api.post<{ userNo: string; tempPassword: string }>(
    `/system/operators/${encodeURIComponent(userNo)}/reset-password`,
  )
}

export function unlockOperator(userNo: string): Promise<{ userNo: string }> {
  return api.post<{ userNo: string }>(`/system/operators/${encodeURIComponent(userNo)}/unlock`)
}

export function changeOperatorStatus(userNo: string, enabled: boolean): Promise<{ userNo: string }> {
  return api.put<{ userNo: string }>(`/system/operators/${encodeURIComponent(userNo)}/status`, { Enabled: enabled })
}

export function exportOperators(): Promise<{ exportId: string; async: boolean }> {
  return api.get<{ exportId: string; async: boolean }>('/system/operators/export')
}

/* ---------------- 角色管理 ---------------- */

export function fetchRoles(keyword?: string): Promise<Role[]> {
  return api.get<Role[]>('/system/roles', { keyword })
}

export function fetchRole(roleNo: string): Promise<Role> {
  return api.get<Role>(`/system/roles/${encodeURIComponent(roleNo)}`)
}

export function createRole(data: { Role_No: string; Role_Name: string; Remark?: string }): Promise<{ roleNo: string }> {
  return api.post<{ roleNo: string }>('/system/roles', data)
}

export function updateRole(roleNo: string, data: { Role_Name?: string; Remark?: string }): Promise<{ roleNo: string }> {
  return api.put<{ roleNo: string }>(`/system/roles/${encodeURIComponent(roleNo)}`, data)
}

export function deleteRole(roleNo: string): Promise<{ roleNo: string }> {
  return api.del<{ roleNo: string }>(`/system/roles/${encodeURIComponent(roleNo)}`)
}

export function copyRole(
  roleNo: string,
  data: { NewRole_No: string; NewRole_Name: string; Remark?: string },
): Promise<{ roleNo: string; copiedRightCount: number }> {
  return api.post<{ roleNo: string; copiedRightCount: number }>(
    `/system/roles/${encodeURIComponent(roleNo)}/copy`,
    data,
  )
}

export function fetchRoleMembers(roleNo: string): Promise<{
  roleNo: string
  members: Array<{ User_No: string; User_Name: string; deptId?: number | null }>
}> {
  return api.get(`/system/roles/${encodeURIComponent(roleNo)}/members`)
}

/* ---------------- 菜单与操作权限 ---------------- */

export function fetchSubsystems(): Promise<Subsystem[]> {
  return api.get<Subsystem[]>('/system/subsystems')
}

export function fetchMenuTree(systemNo = 'BS'): Promise<MenuTreeNode[]> {
  return api.get<MenuTreeNode[]>('/system/menus/tree', { systemNo })
}

export function fetchMenuRights(menuId: number): Promise<{ menuId: number; rights: MenuRight[] }> {
  return api.get(`/system/menus/${menuId}/rights`)
}

export function fetchRoleRights(roleNo: string, systemNo = 'BS'): Promise<{ systemNo: string; items: RoleRightItem[] }> {
  return api.get(`/system/roles/${encodeURIComponent(roleNo)}/rights`, { systemNo })
}

export function saveRoleRights(
  roleNo: string,
  systemNo: string,
  items: RoleRightItem[],
): Promise<SaveResult & { skippedCount: number }> {
  return api.put<SaveResult & { skippedCount: number }>(`/system/roles/${encodeURIComponent(roleNo)}/rights`, {
    System_No: systemNo,
    Items: items,
  })
}

/* ---------------- 部门数据权限 ---------------- */

export interface DeptRightInfo {
  scopeType: number
  ownerDeptId?: number | null
  deptIds: number[]
  coveredCount: number
  summary?: string | null
  updatedTime?: string | null
  readonlyScope: boolean
}

export function fetchDeptRight(userNo: string): Promise<DeptRightInfo> {
  return api.get<DeptRightInfo>(`/system/dept-rights/${encodeURIComponent(userNo)}`)
}

export function saveDeptRight(
  userNo: string,
  scopeType: number,
  deptIds: number[],
  remark?: string,
): Promise<SaveResult> {
  return api.put<SaveResult>(`/system/dept-rights/${encodeURIComponent(userNo)}`, {
    Scope_Type: scopeType,
    Dept_IDs: deptIds,
    Remark: remark,
  })
}

export function previewDeptRight(
  userNo: string,
  scopeType: number,
  deptIds: number[],
): Promise<{ coveredCount: number; personCount: number }> {
  return api.get(`/system/dept-rights/${encodeURIComponent(userNo)}/preview`, {
    scopeType,
    deptIds: deptIds.join(','),
  })
}

/* ---------------- 设备权限 ---------------- */

export function fetchDevices(query: {
  systemNo?: string
  areaNo?: string
  mocType?: string
  keyword?: string
  page?: number
  pageSize?: number
}): Promise<PagedResult<Device>> {
  return api.get<PagedResult<Device>>('/system/devices', { ...query })
}

export function fetchDeviceRights(userNo: string): Promise<{
  userNo: string
  isCashier: boolean
  userMoc?: string | null
  items: DeviceRightItem[]
}> {
  return api.get(`/system/device-rights/${encodeURIComponent(userNo)}`)
}

export function saveDeviceRights(userNo: string, items: DeviceRightItem[]): Promise<SaveResult> {
  return api.put<SaveResult>(`/system/device-rights/${encodeURIComponent(userNo)}`, {
    Items: items.map((item) => ({ Moc_No: item.mocNo, Right_Level: item.rightLevel })),
  })
}

/* ---------------- 子系统权限 ---------------- */

export function fetchSubsystemOptions(roleNo?: string): Promise<SubsystemOption[]> {
  return api.get<SubsystemOption[]>('/system/subsystem-rights/options', { roleNo })
}

export function fetchSubsystemRights(userNo: string): Promise<{
  userNo: string
  systemNos: string[]
  unrestricted: boolean
}> {
  return api.get(`/system/subsystem-rights/${encodeURIComponent(userNo)}`)
}

export function saveSubsystemRights(userNo: string, systemNos: string[]): Promise<SaveResult> {
  return api.put<SaveResult>(`/system/subsystem-rights/${encodeURIComponent(userNo)}`, { System_Nos: systemNos })
}

/* ---------------- 出纳授权 ---------------- */

export function fetchCashierAuths(query: {
  keyword?: string
  onlyCashier?: boolean
  page?: number
  pageSize?: number
}): Promise<PagedResult<CashierAuth>> {
  return api.get<PagedResult<CashierAuth>>('/system/cashier-auths', { ...query })
}

export function fetchCashierAuth(userNo: string): Promise<{
  userNo: string
  userName: string
  isCashier: boolean
  cardNo?: string | null
  mocNos: string[]
  remark?: string | null
}> {
  return api.get(`/system/cashier-auths/${encodeURIComponent(userNo)}`)
}

export function fetchCashierDevices(): Promise<Device[]> {
  return api.get<Device[]>('/system/cashier-auths/devices')
}

export function saveCashierAuth(
  userNo: string,
  data: { Is_Cashier: boolean; Card_No?: string; Moc_Nos?: string[]; Remark?: string },
): Promise<SaveResult & { userType: number; cardNo?: string | null; mocNos: string[] }> {
  return api.put(`/system/cashier-auths/${encodeURIComponent(userNo)}`, data)
}
