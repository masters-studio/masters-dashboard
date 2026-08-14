import { apiFetch } from './client';

/**
 * Mirrors EmployeeDto.java exactly. Only FK ids are exposed (employeeTypeId,
 * profitCenterId, ...) — resolve display names via lookups.ts, same
 * convention as the backend (see EmployeeDto's javadoc).
 */
export interface Employee {
  id: number;
  employeeCode: string | null;
  name: string;
  employeeTypeId: number;
  profitCenterId: number;
  compensationModelId: number;
  compensationPercentage: number | null;
  fixedAmount: number | null;
  calculationBasisId: number | null;
  settlementTypeId: number | null;
  /** Required iff compensationModelId is FIXED_AMOUNT ("renter") — day of
   *  month ChairRentalIncomeScheduler bills their rent on. Forbidden for
   *  every other compensation model. */
  rentalDayOfMonth: number | null;
  active: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Mirrors EmployeeRequest.java exactly — shared shape for both create (POST)
 * and update (PUT), since a PUT is a full replace. Whether
 * compensationPercentage/fixedAmount/calculationBasisId is required or
 * forbidden depends on compensationModelId — see EmployeeService's
 * validateCompensation(); the form (EmployeeForm.tsx) mirrors that same
 * table client-side so a bad combination never reaches the API.
 */
export interface EmployeeRequest {
  employeeCode: string | null;
  name: string;
  employeeTypeId: number;
  profitCenterId: number;
  compensationModelId: number;
  compensationPercentage: number | null;
  fixedAmount: number | null;
  calculationBasisId: number | null;
  settlementTypeId: number | null;
  rentalDayOfMonth: number | null;
  active: boolean | null;
  notes: string | null;
}

export interface EmployeeListFilters {
  profitCenterId?: number;
  employeeTypeId?: number;
  includeInactive?: boolean;
}

export function listEmployees(filters: EmployeeListFilters = {}): Promise<Employee[]> {
  const params = new URLSearchParams();
  if (filters.profitCenterId != null) params.set('profitCenterId', String(filters.profitCenterId));
  if (filters.employeeTypeId != null) params.set('employeeTypeId', String(filters.employeeTypeId));
  if (filters.includeInactive) params.set('includeInactive', 'true');
  const query = params.toString();
  return apiFetch<Employee[]>(`/employees${query ? `?${query}` : ''}`);
}

export function getEmployee(id: number): Promise<Employee> {
  return apiFetch<Employee>(`/employees/${id}`);
}

export function createEmployee(request: EmployeeRequest): Promise<Employee> {
  return apiFetch<Employee>('/employees', { method: 'POST', body: request });
}

export function updateEmployee(id: number, request: EmployeeRequest): Promise<Employee> {
  return apiFetch<Employee>(`/employees/${id}`, { method: 'PUT', body: request });
}

/** Soft-deactivate (sets active=false) — not a real delete, see EmployeeController. */
export function deactivateEmployee(id: number): Promise<void> {
  return apiFetch<void>(`/employees/${id}`, { method: 'DELETE' });
}

/** Reverses deactivateEmployee — sets active=true. */
export function activateEmployee(id: number): Promise<void> {
  return apiFetch<void>(`/employees/${id}/activate`, { method: 'POST' });
}

/** A genuine, irreversible delete — only succeeds if already inactive and
 *  nothing references this employee (see EmployeeService#deletePermanently). */
export function deleteEmployeePermanently(id: number): Promise<void> {
  return apiFetch<void>(`/employees/${id}/permanent`, { method: 'DELETE' });
}
