import { apiFetch } from './client';

/**
 * Mirrors RecurringExpenseDto.java exactly. Only FK ids are exposed —
 * resolve display names via categories.ts/suppliers.ts/lookups.ts, same
 * convention as every other domain.
 */
export interface RecurringExpense {
  id: number;
  name: string;
  amount: number;
  dayOfMonth: number;
  profitCenterId: number;
  categoryId: number | null;
  subcategoryId: number | null;
  supplierId: number | null;
  paymentMethodId: number | null;
  vatTypeId: number;
  active: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Mirrors RecurringExpenseRequest.java exactly — shared shape for create
 * (POST) and update (PUT). active, left null, defaults to true server-side.
 */
export interface RecurringExpenseRequest {
  name: string;
  amount: number;
  dayOfMonth: number;
  profitCenterId: number;
  categoryId: number | null;
  subcategoryId: number | null;
  supplierId: number | null;
  paymentMethodId: number | null;
  vatTypeId: number;
  active: boolean | null;
  notes: string | null;
}

export function listRecurringExpenses(includeInactive = false): Promise<RecurringExpense[]> {
  const query = includeInactive ? '?includeInactive=true' : '';
  return apiFetch<RecurringExpense[]>(`/recurring-expenses${query}`);
}

export function getRecurringExpense(id: number): Promise<RecurringExpense> {
  return apiFetch<RecurringExpense>(`/recurring-expenses/${id}`);
}

export function createRecurringExpense(request: RecurringExpenseRequest): Promise<RecurringExpense> {
  return apiFetch<RecurringExpense>('/recurring-expenses', { method: 'POST', body: request });
}

export function updateRecurringExpense(
  id: number,
  request: RecurringExpenseRequest,
): Promise<RecurringExpense> {
  return apiFetch<RecurringExpense>(`/recurring-expenses/${id}`, { method: 'PUT', body: request });
}

/** Pause generation — not a real delete, see RecurringExpenseController. */
export function deactivateRecurringExpense(id: number): Promise<void> {
  return apiFetch<void>(`/recurring-expenses/${id}`, { method: 'DELETE' });
}

/** Resume generation — reverses deactivateRecurringExpense. */
export function activateRecurringExpense(id: number): Promise<void> {
  return apiFetch<void>(`/recurring-expenses/${id}/activate`, { method: 'POST' });
}

/** A genuine, irreversible delete — only succeeds if it never generated real
 *  expense history (see RecurringExpenseService#deletePermanently). */
export function deleteRecurringExpensePermanently(id: number): Promise<void> {
  return apiFetch<void>(`/recurring-expenses/${id}/permanent`, { method: 'DELETE' });
}
