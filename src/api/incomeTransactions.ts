import { apiFetch } from './client';

/**
 * Mirrors IncomeTransactionDto.java exactly. The *Snapshot fields,
 * netAmount/vatAmount/employeeShare/businessShare are all computed
 * server-side (see IncomeTransactionService's VAT-extraction and revenue-
 * split logic) — never sent in a request, only ever read here.
 */
export interface IncomeTransaction {
  id: number;
  transactionNumber: string | null;
  transactionDate: string; // ISO date (YYYY-MM-DD)
  employeeId: number | null;
  profitCenterId: number;
  categoryId: number | null;
  subcategoryId: number | null;
  grossAmount: number;
  vatRate: number;
  netAmount: number;
  vatAmount: number;
  paymentMethodId: number | null;
  paymentStatusId: number;
  calculationBasisSnapshot: string | null;
  employeePercentageSnapshot: number | null;
  compensationModelSnapshot: string | null;
  employeeTypeSnapshot: string | null;
  profitCenterSnapshot: string;
  employeeShare: number | null;
  businessShare: number | null;
  referenceNumber: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: number | null;
  updatedBy: number | null;
  deletedAt: string | null;
}

/**
 * Mirrors IncomeTransactionRequest.java exactly — shared shape for create
 * (POST) and update (PUT). Deliberately excludes every computed/snapshot
 * field above; the server derives all of that from grossAmount + vatRate +
 * the attached employee's live compensation settings at save time.
 * vatRate=null lets the server fall back to the current system default.
 */
export interface IncomeTransactionRequest {
  transactionNumber: string | null;
  transactionDate: string;
  employeeId: number | null;
  profitCenterId: number;
  categoryId: number | null;
  subcategoryId: number | null;
  grossAmount: number;
  vatRate: number | null;
  paymentMethodId: number | null;
  paymentStatusId: number;
  referenceNumber: string | null;
  notes: string | null;
}

export interface IncomeTransactionListFilters {
  profitCenterId?: number;
  employeeId?: number;
  from?: string;
  to?: string;
  includeDeleted?: boolean;
}

export function listIncomeTransactions(
  filters: IncomeTransactionListFilters = {},
): Promise<IncomeTransaction[]> {
  const params = new URLSearchParams();
  if (filters.profitCenterId != null) params.set('profitCenterId', String(filters.profitCenterId));
  if (filters.employeeId != null) params.set('employeeId', String(filters.employeeId));
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.includeDeleted) params.set('includeDeleted', 'true');
  const query = params.toString();
  return apiFetch<IncomeTransaction[]>(`/income-transactions${query ? `?${query}` : ''}`);
}

export function getIncomeTransaction(id: number): Promise<IncomeTransaction> {
  return apiFetch<IncomeTransaction>(`/income-transactions/${id}`);
}

export function createIncomeTransaction(request: IncomeTransactionRequest): Promise<IncomeTransaction> {
  return apiFetch<IncomeTransaction>('/income-transactions', { method: 'POST', body: request });
}

export function updateIncomeTransaction(
  id: number,
  request: IncomeTransactionRequest,
): Promise<IncomeTransaction> {
  return apiFetch<IncomeTransaction>(`/income-transactions/${id}`, { method: 'PUT', body: request });
}

/**
 * Soft-delete via deleted_at — unlike Employee/Supplier deactivation, there
 * is no way back through the API (see IncomeTransactionService javadoc), so
 * callers should confirm with stronger wording than a plain deactivate.
 */
export function deleteIncomeTransaction(id: number): Promise<void> {
  return apiFetch<void>(`/income-transactions/${id}`, { method: 'DELETE' });
}
