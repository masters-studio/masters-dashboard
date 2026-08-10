import { apiFetch } from './client';

/**
 * Typed wrappers for every /lookups/* endpoint (masters-api,
 * ReferenceDataController.java) — dropdown data for every domain form.
 * Built once, reused by every screen (Employees today; Suppliers/
 * Income/Expenses later) rather than re-declared per domain.
 */

/** Shared shape for the six id/name/active-only lookup tables. */
export interface SimpleLookup {
  id: number;
  name: string;
  active: boolean;
}

/** code drives EmployeeService's compensation/type logic; name is the Hebrew label. */
export interface EmployeeTypeLookup {
  id: number;
  code: string;
  name: string;
  active: boolean;
}

/** code (PERCENTAGE / FIXED_SALARY / FIXED_AMOUNT) drives which employee fields apply. */
export interface CompensationModelLookup {
  id: number;
  code: 'PERCENTAGE' | 'FIXED_SALARY' | 'FIXED_AMOUNT';
  name: string;
  active: boolean;
}

/** No active flag — calculation_bases has no such column. */
export interface CalculationBasisLookup {
  id: number;
  code: string;
  label: string;
}

/** code drives ExpenseTransaction VAT deductibility math; label is the Hebrew shown in the UI. */
export interface VatTypeLookup {
  id: number;
  code: 'FULL' | 'PARTIAL' | 'NONE';
  label: string;
  active: boolean;
}

function simpleLookup(path: string, includeInactive = false): Promise<SimpleLookup[]> {
  return apiFetch<SimpleLookup[]>(`${path}?includeInactive=${includeInactive}`);
}

export const listProfitCenters = (includeInactive = false) =>
  simpleLookup('/lookups/profit-centers', includeInactive);

export const listPaymentMethods = (includeInactive = false) =>
  simpleLookup('/lookups/payment-methods', includeInactive);

export const listPaymentTerms = (includeInactive = false) =>
  simpleLookup('/lookups/payment-terms', includeInactive);

export const listPaymentStatuses = (includeInactive = false) =>
  simpleLookup('/lookups/payment-statuses', includeInactive);

export const listSettlementTypes = (includeInactive = false) =>
  simpleLookup('/lookups/settlement-types', includeInactive);

export const listExpenseNatures = (includeInactive = false) =>
  simpleLookup('/lookups/expense-natures', includeInactive);

export function listVatTypes(includeInactive = false): Promise<VatTypeLookup[]> {
  return apiFetch<VatTypeLookup[]>(`/lookups/vat-types?includeInactive=${includeInactive}`);
}

export function listEmployeeTypes(includeInactive = false): Promise<EmployeeTypeLookup[]> {
  return apiFetch<EmployeeTypeLookup[]>(`/lookups/employee-types?includeInactive=${includeInactive}`);
}

export function listCompensationModels(includeInactive = false): Promise<CompensationModelLookup[]> {
  return apiFetch<CompensationModelLookup[]>(
    `/lookups/compensation-models?includeInactive=${includeInactive}`,
  );
}

/** No includeInactive param — calculation_bases has no active column to filter on. */
export function listCalculationBases(): Promise<CalculationBasisLookup[]> {
  return apiFetch<CalculationBasisLookup[]>('/lookups/calculation-bases');
}
