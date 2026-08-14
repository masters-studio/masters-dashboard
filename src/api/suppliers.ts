import { apiFetch } from './client';

/**
 * Mirrors SupplierDto.java exactly. Only FK ids are exposed — resolve
 * display names via categories.ts / lookups.ts, same convention as
 * employees.ts.
 */
export interface Supplier {
  id: number;
  supplierCode: string | null;
  name: string;
  categoryId: number | null;
  subcategoryId: number | null;
  supplierType: string | null;
  paymentTermsId: number | null;
  paymentMethodId: number | null;
  expenseNatureId: number | null;
  active: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Mirrors SupplierRequest.java exactly — shared shape for create (POST) and
 * update (PUT). SupplierService enforces (not this shape): categoryId/
 * subcategoryId must be EXPENSE-type categories, and subcategoryId must
 * actually be a child of categoryId — SupplierForm.tsx mirrors that rule
 * client-side by only offering EXPENSE categories and only enabling the
 * subcategory select once a category is chosen.
 */
export interface SupplierRequest {
  supplierCode: string | null;
  name: string;
  categoryId: number | null;
  subcategoryId: number | null;
  supplierType: string | null;
  paymentTermsId: number | null;
  paymentMethodId: number | null;
  expenseNatureId: number | null;
  active: boolean | null;
  notes: string | null;
}

export interface SupplierListFilters {
  categoryId?: number;
  expenseNatureId?: number;
  includeInactive?: boolean;
}

export function listSuppliers(filters: SupplierListFilters = {}): Promise<Supplier[]> {
  const params = new URLSearchParams();
  if (filters.categoryId != null) params.set('categoryId', String(filters.categoryId));
  if (filters.expenseNatureId != null) params.set('expenseNatureId', String(filters.expenseNatureId));
  if (filters.includeInactive) params.set('includeInactive', 'true');
  const query = params.toString();
  return apiFetch<Supplier[]>(`/suppliers${query ? `?${query}` : ''}`);
}

export function getSupplier(id: number): Promise<Supplier> {
  return apiFetch<Supplier>(`/suppliers/${id}`);
}

export function createSupplier(request: SupplierRequest): Promise<Supplier> {
  return apiFetch<Supplier>('/suppliers', { method: 'POST', body: request });
}

export function updateSupplier(id: number, request: SupplierRequest): Promise<Supplier> {
  return apiFetch<Supplier>(`/suppliers/${id}`, { method: 'PUT', body: request });
}

/** Soft-deactivate (sets active=false) — not a real delete, see SupplierController. */
export function deactivateSupplier(id: number): Promise<void> {
  return apiFetch<void>(`/suppliers/${id}`, { method: 'DELETE' });
}

/** Reverses deactivateSupplier — sets active=true. */
export function activateSupplier(id: number): Promise<void> {
  return apiFetch<void>(`/suppliers/${id}/activate`, { method: 'POST' });
}

/** A genuine, irreversible delete — only succeeds if already inactive and
 *  nothing references this supplier (see SupplierService#deletePermanently). */
export function deleteSupplierPermanently(id: number): Promise<void> {
  return apiFetch<void>(`/suppliers/${id}/permanent`, { method: 'DELETE' });
}
