/** 系统管理-系统配置与安全审计：接口返回结构定义 */

export interface ParamGroupNode {
  groupName: string;
  count: number;
}

export interface ParamScopeNode {
  scope: string;
  scopeName: string;
  groups: ParamGroupNode[];
}

export interface ParamItem {
  code: string;
  name: string;
  value?: string | null;
  defaultValue?: string | null;
  type: string;
  options?: string | null;
  minValue?: string | null;
  maxValue?: string | null;
  groupName?: string | null;
  restartRequired: boolean;
  readOnly: boolean;
  remark?: string | null;
  updatedTime?: string | null;
  modified: boolean;
}

export interface ParamListResult {
  scope: string;
  scopeName: string;
  items: ParamItem[];
  warning?: string | null;
}

export interface ParamBackup {
  backupId: number;
  scope: string;
  backupName: string;
  itemCount: number;
  hash?: string | null;
  createUser?: string | null;
  createTime: string;
  remark?: string | null;
}

export interface DictTable {
  tableName: string;
  tableChsName?: string | null;
  itemCount: number;
}

export interface DictItem {
  id: number;
  tableName: string;
  dictId?: string | null;
  dictValue?: string | null;
  sysCol: boolean;
  remark?: string | null;
}

export interface DictMetaField {
  id: number;
  tableName: string;
  fieldName: string;
  fieldNote?: string | null;
  fieldNo?: number | null;
  isPk: boolean;
  fieldType?: string | null;
  fieldLength?: number | null;
  baseTable?: string | null;
}

export interface DictMetaColumn {
  id: number;
  gridName?: string | null;
  fieldName?: string | null;
  displayName?: string | null;
  displayLen?: number | null;
  fieldIndex?: number | null;
  isShow: boolean;
  isSum: boolean;
}

export interface DictMetaResult<T> {
  available: boolean;
  items: T[];
  message?: string | null;
}

export interface ConsistencyItem {
  issueType: string;
  tableName: string;
  fieldName?: string | null;
  metaValue?: string | null;
  dbValue?: string | null;
  message?: string | null;
}

export interface Endpoint {
  id: number;
  endpointCode: string;
  endpointName: string;
  endpointType: string;
  baseUrl?: string | null;
  authMode?: string | null;
  configJson?: string | null;
  hasSecret: boolean;
  secretUpdatedTime?: string | null;
  timeoutSec?: number | null;
  retryCount?: number | null;
  isEnabled: boolean;
  healthStatus: number;
  lastCheckTime?: string | null;
  lastCheckMessage?: string | null;
  sortNo?: number | null;
  taskCount: number;
  secretHistoryCount: number;
}

export interface SyncTask {
  taskId: number;
  taskCode: string;
  taskName: string;
  taskType: string;
  endpointCode?: string | null;
  direction: string;
  cronExpr?: string | null;
  batchSize?: number | null;
  timeoutSec?: number | null;
  isEnabled: boolean;
  lastRunTime?: string | null;
  lastStatus?: number | null;
  lastMessage?: string | null;
  nextRunTime?: string | null;
}

export interface MaintJob {
  jobId: number;
  jobType: string;
  jobName: string;
  paramsJson?: string | null;
  status: number;
  progress: number;
  message?: string | null;
  backupJobId?: number | null;
  createUser?: string | null;
  createTime: string;
  startTime?: string | null;
  finishTime?: string | null;
  traceId?: string | null;
}

export interface MaintStep {
  idKey: number;
  jobId: number;
  step?: string | null;
  message?: string | null;
  affected?: number | null;
  logTime: string;
}

export interface FragmentationItem {
  schemaName: string;
  tableName: string;
  indexName: string;
  avgFragmentation: number;
  pageCount: number;
}

export interface CleanupTableStat {
  tableName: string;
  dateField: string;
  rows: number;
  historyTable: string;
  historyExists: boolean;
}

export interface CleanupPreview {
  cutoffDate: string;
  tables: CleanupTableStat[];
  totalRows: number;
  affectedPersons: number;
  activeSessions: number;
  maintenanceMode: boolean;
  confirmPhrase: string;
}

export interface MaintModeInfo {
  enabled: boolean;
  until?: string | null;
  runningJobs: number;
  activeSessions: number;
  sessionBlocked: boolean;
}

export interface BlacklistItem {
  id: number;
  personId?: number | null;
  cardNo?: string | null;
  personNo?: string | null;
  personName?: string | null;
  deptName?: string | null;
  delDate?: string | null;
  delSign: boolean;
  remark?: string | null;
  cardState?: string | null;
  retainDays: number;
  releaseableTime?: string | null;
  releaseable: boolean;
  addUser?: string | null;
  source: string;
}

export interface CardLookup {
  cardNo: string;
  personId?: number | null;
  personNo?: string | null;
  personName?: string | null;
  deptName?: string | null;
  cardState?: string | null;
  validDate?: string | null;
  exists: boolean;
  inBlacklist?: boolean;
  retainDays?: number;
  message?: string;
}

export interface SystemLog {
  source: string;
  id: number;
  time: string;
  userName?: string | null;
  computer?: string | null;
  systemNo?: string | null;
  eventDesc?: string | null;
  traceId?: string | null;
  module?: string | null;
  action?: string | null;
}

export interface LoginLog {
  source: string;
  id: number;
  time: string;
  userNo?: string | null;
  userName?: string | null;
  loginType?: string | null;
  result: number;
  failReason?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  logoutTime?: string | null;
  sessionId?: string | null;
  repeatCount: number;
}

export interface LoginStatistics {
  todaySuccess: number;
  todayFail: number;
  lockedAccounts: number;
  abnormalIps: number;
  abnormalIpList: Array<{ ip?: string | null; count: number }>;
  hourly: Array<{ hour: number; count: number }>;
}

export interface OperLog {
  source: string;
  id: number;
  time: string;
  userNo?: string | null;
  userName?: string | null;
  module?: string | null;
  action?: string | null;
  target?: string | null;
  targetKey?: string | null;
  result: number;
  message?: string | null;
  ip?: string | null;
  traceId?: string | null;
  hasDiff?: boolean;
  highRisk?: boolean;
}

export interface SyncLog {
  source: string;
  sourceLabel?: string | null;
  id: number;
  time: string;
  taskCode?: string | null;
  syncType?: string | null;
  direction?: string | null;
  target?: string | null;
  targetKey?: string | null;
  status: string;
  elapsed?: number | null;
  message?: string | null;
  retryCount: number;
  traceId?: string | null;
  requestBody?: string | null;
  responseBody?: string | null;
  canRetry?: boolean;
}

export interface ExportResult {
  fileName: string;
  content: string;
  itemCount?: number;
  rowCount?: number;
  truncated?: boolean;
  message?: string | null;
}
