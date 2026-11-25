/** 系统管理-组织与权限：后端接口返回结构定义 */

export interface PagedResult<T> {
  total: number;
  items: T[];
}

export interface DepartmentTreeNode {
  deptId: number;
  deptNo?: string;
  deptName?: string;
  parentId?: number | null;
  level: number;
  chief?: string | null;
  personCount: number;
  activeCount?: number;
  disabled: boolean;
  sortNo?: number | null;
}

export interface Operator {
  userNo: string;
  userName: string;
  roleNo?: string | null;
  roleName?: string | null;
  deptId?: number | null;
  deptName?: string | null;
  userType?: number | null;
  status: string;
  csOnline: boolean;
  computerName?: string | null;
  recentLogin?: string | null;
  remark?: string | null;
}

export interface OperatorDetail extends Operator {
  dataScopeType: number;
  dataScopeSummary?: string | null;
  subsystems: string[];
}

export interface OperatorSavePayload {
  User_No: string;
  User_Name: string;
  Role_No: string;
  Dept_ID?: number | null;
  User_Type?: number;
  Password?: string;
  Is_Del?: boolean;
  Remark?: string;
}

export interface Role {
  roleNo: string;
  roleName: string;
  remark?: string | null;
  builtIn: boolean;
  memberCount: number;
  permissionCount: number;
}

export interface Subsystem {
  systemNo: string;
  systemName: string;
  indexNo?: number | null;
}

export interface SubsystemOption extends Subsystem {
  roleMenuCount: number;
}

export interface MenuTreeNode {
  menuId: number;
  systemNo: string;
  menuNo: string;
  menuName: string;
  parentId?: number | null;
  formName?: string | null;
  index?: number | null;
  assignable: boolean;
  /** ST_RightInfo.Right_Values 原值，如 "012345"；空串表示该菜单没有可分配位 */
  rightValues?: string | null;
  /** 该菜单自己的权限位明细；同一编号在不同菜单下语义不同，名称以这里为准 */
  rights?: MenuRight[] | null;
}

export interface MenuRight {
  rightId: string;
  rightName: string;
  permissionCode?: string | null;
}

export interface RoleRightItem {
  menuId: number;
  rightIds: string[];
}

export interface Device {
  mocNo: string;
  mocName: string;
  systemNo: string;
  areaNo?: string | null;
  mocType?: string | null;
  commStatus?: number | null;
  downloadStatus?: number | null;
}

export interface DeviceRightItem {
  mocNo: string;
  rightLevel: number;
}

export interface CashierAuth {
  userNo: string;
  userName: string;
  isCashier: boolean;
  cardNo?: string | null;
  mocCount: number;
  status: string;
}

export interface SaveResult {
  savedCount?: number;
  skippedCount?: number;
  coveredCount?: number;
  conflictCount?: number;
  version?: number;
  userMoc?: string | null;
  summary?: string;
}

export interface AuthProfileResult {
  user: {
    userId: string;
    userName: string;
    displayName: string;
    roleNo: string;
    roleName: string;
    deptName: string;
    userType?: string;
    permissions: string[];
  };
  menus?: string[];
  version?: number;
}
