import { apiFetch } from './client';

/**
 * Mirrors ExpenseTransactionDto.java exactly. netAmount, vatAmount,
 * deductibleVat (for FULL/NONE), and trueBusinessCost are all computed
 * server-side (see ExpenseTransactionService's VAT-extraction and
 * deductibility logic) — never sent in a request, only ever read here.
 */
export interface ExpenseTransaction {
  id: number;
  expenseNumber: string | null;
  expenseDate: string; // ISO date (YYYY-MM-DD)
  supplierId: number | null;
  profitCenterId: number;
  categoryId: number | null;
  subcategoryId: number | null;
  paymentMethodId: number | null;
  paymentTermsId: number | null;
  grossAmount: number;
  netAmount: number;
  vatAmount: number;
  vatTypeId: number;
  deductibleVat: number;
  trueBusinessCost: number;
  paymentStatusId: number;
  referenceNumber: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: number | null;
  updatedBy: number | null;
  deletedAt: string | null;
}

/**
 * Mirrors ExpenseTransactionRequest.java exactly — shared shape for create
 * (POST) and update (PUT). deductibleVat's meaning depends on vatTypeId:
 * must be null for FULL/NONE (the server computes it), required for
 * PARTIAL — ExpenseTransactionForm.tsx mirrors that rule client-side.
 * vatRate=null lets the server fall back to the current system default,
 * same as income transactions; unlike income, this table has no column to
 * persist the rate itself, only its effect on netAmount/vatAmount.
 */
export interface ExpenseTransactionRequest {
  expenseNumber: string | null;
  expenseDate: string;
  supplierId: number | null;
  profitCenterId: number;
  categoryId: number | null;
  subcategoryId: number | null;
  paymentMethodId: number | null;
  paymentTermsId: number | null;
  grossAmount: number;
  vatRate: number | null;
  vatTypeId: number;
  deductibleVat: number | null;
  paymentStatusId: number;
  referenceNumber: string | null;
  notes: string | null;
}

export interface ExpenseTransactionListFilters {
  profitCenterId?: number;
  supplierId?: number;
  from?: string;
  to?: string;
  includeDeleted?: boolean;
}

export function listExpenseTransactions(
  filters: ExpenseTransactionListFilters = {},
): Promise<ExpenseTransaction[]> {
  const params = new URLSearchParams();
  if (filters.profitCenterId != null) params.set('profitCenterId', String(filters.profitCenterId));
  if (filters.supplierId != null) params.set('supplierId', String(filters.supplierId));
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.includeDeleted) params.set('includeDeleted', 'true');
  const query = params.toString();
  return apiFetch<ExpenseTransaction[]>(`/expense-transactions${query ? `?${query}` : ''}`);
}

export function getExpenseTransaction(id: number): Promise<ExpenseTransaction> {
  return apiFetch<ExpenseTransaction>(`/expense-transactions/${id}`);
}

export function createExpenseTransaction(
  request: ExpenseTransactionRequest,
): Promise<ExpenseTransaction> {
  return apiFetch<ExpenseTransaction>('/expense-transactions', { method: 'POST', body: request });
}

export function updateExpenseTransaction(
  id: number,
  request: ExpenseTransactionRequest,
): Promise<ExpenseTransaction> {
  return apiFetch<ExpenseTransaction>(`/expense-transactions/${id}`, { method: 'PUT', body: request });
}

/**
 * Soft-delete via deleted_at — no way back through the API (same as income
 * transactions), so callers should confirm with stronger wording than a
 * plain deactivate.
 */
export function deleteExpenseTransaction(id: number): Promise<void> {
  return apiFetch<void>(`/expense-transactions/${id}`, { method: 'DELETE' });
}
