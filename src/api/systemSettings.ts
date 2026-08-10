import { apiFetch } from './client';

/**
 * Mirrors SystemSettingDto.java exactly. Unlike every other domain, there
 * is no create or delete here — settings are developer-defined via Flyway
 * migration on the backend, never invented through the API, only ever
 * edited. updatedAt/updatedBy are null until the first edit (a fresh
 * migration-seeded row has never been touched through this endpoint).
 */
export interface SystemSetting {
  settingKey: string;
  settingValue: string;
  description: string | null;
  updatedAt: string | null;
  updatedBy: number | null;
}

export function listSystemSettings(): Promise<SystemSetting[]> {
  return apiFetch<SystemSetting[]>('/system-settings');
}

export function updateSystemSetting(key: string, settingValue: string): Promise<SystemSetting> {
  return apiFetch<SystemSetting>(`/system-settings/${key}`, {
    method: 'PUT',
    body: { settingValue },
  });
}
