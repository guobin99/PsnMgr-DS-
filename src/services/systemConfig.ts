import { api } from '@/services/http';
import type {
  BlacklistItem,
  CardLookup,
  CleanupPreview,
  ConsistencyItem,
  DictItem,
  DictMetaColumn,
  DictMetaField,
  DictMetaResult,
  DictTable,
  Endpoint,
  ExportResult,
  FragmentationItem,
  LoginLog,
  LoginStatistics,
  MaintJob,
  MaintModeInfo,
  MaintStep,
  OperLog,
  ParamBackup,
  ParamListResult,
  ParamScopeNode,
  SyncLog,
  SyncTask,
  SystemLog,
} from '@/types/systemConfig';

/* ---------------- 系统参数 ---------------- */

export function fetchParamGroups(): Promise<ParamScopeNode[]> {
  return api.get<ParamScopeNode[]>('/system/params/groups');
}

export function fetchParams(scope: string, groupName?: string, keyword?: string): Promise<ParamListResult> {
  return api.get<ParamListResult>('/system/params', { scope, groupName, keyword });
}

export function saveParams(scope: string, items: Array<{ paramCode: string; value: string; oldValue?: string }>) {
  return api.put<{ savedCount: number; skippedCount: number; needRestart: string[]; version: number }>(
    '/system/params',
    { Scope: scope, Items: items },
  );
}

export function resetParams(scope: string, codes: string[]) {
  return api.post<{ changedCount: number; skippedCount: number; needRestart: string[]; version: number }>(
    '/system/params/reset',
    { Scope: scope, Codes: codes },
  );
}

export function fetchParamBackups(scope?: string): Promise<ParamBackup[]> {
  return api.get<ParamBackup[]>('/system/params/backups', { scope });
}

export function createParamBackup(scope: string, name?: string, remark?: string) {
  return api.post<{ backupId: number; itemCount: number }>('/system/params/backups', {
    Scope: scope,
    Name: name,
    Remark: remark,
  });
}

export function restoreParamBackup(backupId: number) {
  return api.post<{ changedCount: number; version: number }>(`/system/params/backups/${backupId}/restore`);
}

export function deleteParamBackup(backupId: number) {
  return api.del<{ backupId: number }>(`/system/params/backups/${backupId}`);
}

export interface ParamImportPlan {
  newCount: number;
  modifiedCount: number;
  unchanged: string[];
  conflicts: string[];
  changes: Array<{ code: string; value?: string; oldValue?: string; isNew: boolean }>;
}

export function previewParamImport(scope: string, items: Array<{ code: string; value: string }>) {
  return api.post<ParamImportPlan>('/system/params/import/preview', { Scope: scope, Items: items });
}

export function importParams(scope: string, items: Array<{ code: string; value: string }>) {
  return api.post<{ savedCount: number; skippedCount: number; version: number }>('/system/params/import', {
    Scope: scope,
    Items: items,
  });
}

export function exportParams(scope: string): Promise<ExportResult> {
  return api.get<ExportResult>('/system/params/export', { scope });
}

/* ---------------- 数据字典 ---------------- */

export function fetchDictTables(keyword?: string): Promise<DictTable[]> {
  return api.get<DictTable[]>('/system/dict/tables', { keyword });
}

export function fetchDictItems(tableName: string, keyword?: string, page = 1, pageSize = 50) {
  return api.get<{ total: number; items: DictItem[] }>('/system/dict/items', {
    tableName,
    keyword,
    page,
    pageSize,
  });
}

export function createDictItem(data: {
  TableName: string;
  Dict_Id?: string;
  Dict_Value: string;
  Is_SysCol?: boolean;
  Remark?: string;
}) {
  return api.post<{ id: number; dictId: string }>('/system/dict/items', data);
}

export function updateDictItem(
  id: number,
  data: { Dict_Id?: string; Dict_Value?: string; Remark?: string; OldDict_Id?: string; OldDict_Value?: string },
) {
  return api.put<{ id: number }>(`/system/dict/items/${id}`, data);
}

export function deleteDictItem(id: number) {
  return api.del<{ id: number }>(`/system/dict/items/${id}`);
}

export function importDictItems(
  tableName: string,
  items: Array<{ dictId: string; dictValue: string }>,
  overwrite: boolean,
) {
  return api.post<{ inserted: number; updated: number; skipped: number }>('/system/dict/items/import', {
    TableName: tableName,
    Items: items,
    Overwrite: overwrite,
  });
}

export function exportDictItems(tableName: string): Promise<ExportResult> {
  return api.get<ExportResult>('/system/dict/items/export', { tableName });
}

export function fetchDictMetaTables(): Promise<DictMetaResult<DictTable>> {
  return api.get<DictMetaResult<DictTable>>('/system/dict/meta/tables');
}

export function fetchDictMetaFields(tableName?: string): Promise<DictMetaResult<DictMetaField>> {
  return api.get<DictMetaResult<DictMetaField>>('/system/dict/meta/fields', { tableName });
}

export function fetchDictMetaColumns(tableName?: string): Promise<DictMetaResult<DictMetaColumn>> {
  return api.get<DictMetaResult<DictMetaColumn>>('/system/dict/meta/columns', { tableName });
}

export function syncDictMeta(tableName: string) {
  return api.post<{ inserted: number; updated: number; pending: number }>('/system/dict/meta/sync', {
    TableName: tableName,
  });
}

export function fetchConsistency(tableName?: string) {
  return api.get<{ metaAvailable: boolean; items: ConsistencyItem[] }>('/system/dict/consistency', {
    tableName,
  });
}

export function buildFixScript(): Promise<ExportResult> {
  return api.post<ExportResult>('/system/dict/consistency/fix-script');
}

/* ---------------- 接口与集成 ---------------- */

export function fetchEndpoints(params?: { type?: string; keyword?: string }): Promise<Endpoint[]> {
  return api.get<Endpoint[]>('/system/integrations', { ...params });
}

export function fetchEndpoint(code: string): Promise<Endpoint> {
  return api.get<Endpoint>(`/system/integrations/${encodeURIComponent(code)}`);
}

export function createEndpoint(data: object) {
  return api.post<{ endpointCode: string }>('/system/integrations', data);
}

export function updateEndpoint(code: string, data: object) {
  return api.put<{ endpointCode: string }>(`/system/integrations/${encodeURIComponent(code)}`, data);
}

export function setEndpointSecret(code: string, secret: string, confirm: string, reason: string) {
  return api.put<{ endpointCode: string }>(`/system/integrations/${encodeURIComponent(code)}/secret`, {
    Secret: secret,
    Secret_Confirm: confirm,
    Reason: reason,
  });
}

export function rollbackEndpointSecret(code: string, reason?: string) {
  return api.post<{ endpointCode: string }>(`/system/integrations/${encodeURIComponent(code)}/secret/rollback`, {
    Reason: reason,
  });
}

export function toggleEndpoint(code: string, enabled: boolean) {
  return api.put<{ endpointCode: string; isEnabled: boolean }>(
    `/system/integrations/${encodeURIComponent(code)}/enabled`,
    { Enabled: enabled },
  );
}

export function testEndpoint(code: string) {
  return api.post<{ success: boolean; elapsed: number; message: string; healthStatus: number }>(
    `/system/integrations/${encodeURIComponent(code)}/test`,
  );
}

export function fetchSyncTasks(params?: { endpointCode?: string; keyword?: string }): Promise<SyncTask[]> {
  return api.get<SyncTask[]>('/system/integrations/tasks', { ...params });
}

export function updateSyncTask(code: string, data: object) {
  return api.put<{ taskCode: string }>(`/system/integrations/tasks/${encodeURIComponent(code)}`, data);
}

export function runSyncTask(code: string) {
  return api.post<{ taskCode: string; status: number; traceId?: string; archived?: number }>(
    `/system/integrations/tasks/${encodeURIComponent(code)}/run`,
  );
}

/* ---------------- 数据维护 ---------------- */

export function fetchMaintJobs(params?: {
  jobType?: string;
  status?: number;
  page?: number;
  pageSize?: number;
}) {
  return api.get<{ total: number; items: MaintJob[] }>('/system/maintenance/jobs', { ...params });
}

export function fetchMaintJob(jobId: number) {
  return api.get<{ job: MaintJob; steps: MaintStep[] }>(`/system/maintenance/jobs/${jobId}`);
}

export function fetchMaintMode(): Promise<MaintModeInfo> {
  return api.get<MaintModeInfo>('/system/maintenance/mode');
}

export function setMaintMode(enabled: boolean, hours?: number) {
  return api.put<{ enabled: boolean; until?: string }>('/system/maintenance/mode', {
    Enabled: enabled,
    Hours: hours,
  });
}

export function createBackup(data: {
  BackupType?: string;
  TargetPath?: string;
  Compression?: boolean;
  Verify?: boolean;
}) {
  return api.post<{ jobId: number; path: string; sizeBytes: number }>('/system/maintenance/backups', data);
}

export function fetchBackups(page = 1, pageSize = 20) {
  return api.get<{ total: number; items: MaintJob[] }>('/system/maintenance/backups', { page, pageSize });
}

export function fetchFragmentation(tableName?: string): Promise<FragmentationItem[]> {
  return api.get<FragmentationItem[]>('/system/maintenance/fragmentation', { tableName });
}

export function rebuildIndexes(items: Array<{ TableName: string; IndexName: string }>) {
  return api.post<{ jobId: number; succeeded: number; failed: number; messages: string[] }>(
    '/system/maintenance/rebuild',
    { Items: items },
  );
}

export function updateStatistics(tables: string[]) {
  return api.post<{ jobId: number; succeeded: number; failed: number }>('/system/maintenance/stats', {
    Tables: tables,
  });
}

export function fetchCleanupPreview(cutoffDate: string): Promise<CleanupPreview> {
  return api.get<CleanupPreview>('/system/maintenance/cleanup/preview', { cutoffDate });
}

export function runCleanup(data: {
  CutoffDate: string;
  ConfirmPhrase: string;
  BackupDone: boolean;
  CsExited: boolean;
  Irreversible: boolean;
}) {
  return api.post<{ jobId: number; tables: Array<{ tableName: string; copied: number; deleted: number }> }>(
    '/system/maintenance/cleanup',
    data,
  );
}

export function runSettle(data: { CutoffDate: string; BackupDone: boolean; CsExited: boolean }) {
  return api.post<{ jobId: number; status: number }>('/system/maintenance/settle', data);
}

export function createTransfer(data: { TaskCode: string; Direction: string; Target?: string; TargetKey?: string }) {
  return api.post<{ jobId: number; direction: string; taskCode: string }>(
    '/system/maintenance/transfer',
    data,
  );
}

/* ---------------- 黑名单 ---------------- */

export function fetchBlacklist(params: Record<string, unknown>) {
  return api.get<{ total: number; items: BlacklistItem[] }>('/system/blacklist', params);
}

export function fetchBlacklistItem(id: number): Promise<BlacklistItem> {
  return api.get<BlacklistItem>(`/system/blacklist/${id}`);
}

export function lookupCard(cardNo: string): Promise<CardLookup> {
  return api.get<CardLookup>(`/system/blacklist/card/${encodeURIComponent(cardNo)}`);
}

export function addBlacklist(data: {
  Card_No: string;
  Person_ID?: number;
  Reason: string;
  Del_Sign?: boolean;
  SyncNow?: boolean;
}) {
  return api.post<{ id: number; cardNo: string; personId?: number; cardState?: string; syncTaskCreated: boolean }>(
    '/system/blacklist',
    data,
  );
}

export function importBlacklist(items: Array<{ cardNo: string; reason?: string }>) {
  return api.post<{ added: number; skipped: number; errors: string[] }>('/system/blacklist/import', { Items: items });
}

export function releaseBlacklist(id: number, reason: string) {
  return api.del<{ id: number; cardState?: string; released: boolean }>(`/system/blacklist/${id}`, {
    data: { Reason: reason },
  });
}

export function exportBlacklist(params?: { cardNo?: string; personName?: string }): Promise<ExportResult> {
  return api.get<ExportResult>('/system/blacklist/export', { ...params });
}

/* ---------------- 日志 ---------------- */

export function fetchSystemLogs(params: Record<string, unknown>) {
  return api.get<{ total: number; items: SystemLog[] }>('/system/logs/system', params);
}

export function fetchSystemLogDetail(id: number, source: string) {
  return api.get<{ row: SystemLog; origin: string; note: string }>(`/system/logs/system/${id}`, { source });
}

export function exportSystemLogs(params: Record<string, unknown>): Promise<ExportResult> {
  return api.get<ExportResult>('/system/logs/system/export', params);
}

export function fetchLoginLogs(params: Record<string, unknown>) {
  return api.get<{ total: number; items: LoginLog[] }>('/system/logs/login', params);
}

export function fetchLoginLogDetail(id: number, source: string) {
  return api.get<Record<string, unknown>>(`/system/logs/login/${id}`, { source });
}

export function fetchLoginStatistics(): Promise<LoginStatistics> {
  return api.get<LoginStatistics>('/system/logs/login/statistics');
}

export function exportLoginLogs(params: Record<string, unknown>): Promise<ExportResult> {
  return api.get<ExportResult>('/system/logs/login/export', params);
}

export function fetchOperLogs(params: Record<string, unknown>) {
  return api.get<{ total: number; items: OperLog[] }>('/system/logs/oper', params);
}

export function fetchOperLogDetail(id: number, source: string) {
  return api.get<{ row: OperLog; note: string }>(`/system/logs/oper/${id}`, { source });
}

export function fetchOperLogDiff(id: number) {
  return api.get<{ before: unknown; after: unknown; traceId?: string }>('/system/logs/oper/diff', { id });
}

export function exportOperLogs(params: Record<string, unknown>): Promise<ExportResult> {
  return api.get<ExportResult>('/system/logs/oper/export', params);
}

export function fetchSyncLogs(params: Record<string, unknown>) {
  return api.get<{ total: number; items: SyncLog[]; sources: Record<string, string> }>(
    '/system/logs/sync',
    params,
  );
}

export function fetchSyncLogDetail(source: string, id: number) {
  return api.get<{ row: SyncLog; note: string }>(`/system/logs/sync/${source}/${id}`);
}

export function retrySyncLog(id: number) {
  return api.post<{ retryId: number; sourceId: number }>(`/system/logs/sync/${id}/retry`);
}

export function exportSyncLogs(params: Record<string, unknown>): Promise<ExportResult> {
  return api.get<ExportResult>('/system/logs/sync/export', params);
}

/* ---------------- 通用导出 ---------------- */

/** 把后端返回的文本内容触发为浏览器下载 */
export function downloadText(fileName: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
