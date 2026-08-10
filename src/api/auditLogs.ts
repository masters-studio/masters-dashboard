import { apiFetch } from './client';

/**
 * Mirrors AuditLogDto.java exactly. Read-only, deliberately -- there is no
 * create/update/delete anywhere in AuditLogController; every row is written
 * internally by the domain services themselves. fieldName/oldValue/newValue
 * are only ever populated on an UPDATE row (CREATE/DELETE rows carry a
 * single row with all three null) — see AuditLogService.
 */
export interface AuditLog {
  id: number;
  entityType: string;
  entityId: number;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  changedBy: number | null;
  changedAt: string;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
}

export interface AuditLogListFilters {
  entityType?: string;
  entityId?: number;
  changedBy?: number;
  from?: string;
  to?: string;
}

export function listAuditLogs(filters: AuditLogListFilters = {}): Promise<AuditLog[]> {
  const params = new URLSearchParams();
  if (filters.entityType) params.set('entityType', filters.entityType);
  if (filters.entityId != null) params.set('entityId', String(filters.entityId));
  if (filters.changedBy != null) params.set('changedBy', String(filters.changedBy));
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  const query = params.toString();
  return apiFetch<AuditLog[]>(`/audit-logs${query ? `?${query}` : ''}`);
}
