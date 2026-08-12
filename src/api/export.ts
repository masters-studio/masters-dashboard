import { getToken } from './client';
import type { CategoryType } from './categories';

/**
 * CSV exports (masters-api, ExportController.java) -- separate from apiFetch
 * since every other endpoint returns JSON and this returns a file. A plain
 * `<a href="...">` can't attach the Authorization header, so this fetches the
 * blob manually and triggers the download via a temporary object URL --
 * the standard technique for an authenticated file download in an SPA.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

async function fetchCsv(path: string): Promise<Blob> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}${path}`, { headers });
  if (!response.ok) {
    throw new Error(`הייצוא נכשל (סטטוס ${response.status})`);
  }
  return response.blob();
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function downloadExport(path: string, filename: string): Promise<void> {
  const blob = await fetchCsv(path);
  downloadBlob(blob, filename);
}

export function exportIncomeTransactions(params: { profitCenterId?: number; from?: string; to?: string }) {
  const search = new URLSearchParams();
  if (params.profitCenterId != null) search.set('profitCenterId', String(params.profitCenterId));
  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);
  return downloadExport(`/export/income-transactions?${search.toString()}`, 'הכנסות.csv');
}

export function exportExpenseTransactions(params: { profitCenterId?: number; from?: string; to?: string }) {
  const search = new URLSearchParams();
  if (params.profitCenterId != null) search.set('profitCenterId', String(params.profitCenterId));
  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);
  return downloadExport(`/export/expense-transactions?${search.toString()}`, 'הוצאות.csv');
}

export function exportDashboardSummary(params: { month: number; year: number; profitCenterId?: number }) {
  const search = new URLSearchParams();
  search.set('month', String(params.month));
  search.set('year', String(params.year));
  if (params.profitCenterId != null) search.set('profitCenterId', String(params.profitCenterId));
  return downloadExport(`/export/dashboard-summary?${search.toString()}`, `סיכום-${params.month}-${params.year}.csv`);
}

export function exportEmployees(includeInactive = false) {
  return downloadExport(`/export/employees?includeInactive=${includeInactive}`, 'עובדים.csv');
}

export function exportSuppliers(includeInactive = false) {
  return downloadExport(`/export/suppliers?includeInactive=${includeInactive}`, 'ספקים.csv');
}

export function exportCategories(params: { type?: CategoryType; profitCenterId?: number; includeInactive?: boolean }) {
  const search = new URLSearchParams();
  if (params.type) search.set('type', params.type);
  if (params.profitCenterId != null) search.set('profitCenterId', String(params.profitCenterId));
  if (params.includeInactive) search.set('includeInactive', 'true');
  return downloadExport(`/export/categories?${search.toString()}`, 'קטגוריות.csv');
}
