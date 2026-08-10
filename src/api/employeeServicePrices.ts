import { apiFetch } from './client';

/**
 * Mirrors EmployeeServicePriceDto.java. One row per employee/service pair
 * holding their *current* price only — price changes are forward-only (see
 * masters-dashboard-roadmap-2026-08 memory, item 4), so there's no history
 * to browse here, just today's price list.
 */
export interface EmployeeServicePrice {
  id: number;
  employeeId: number;
  serviceId: number;
  serviceName: string;
  price: number;
}

export function listEmployeeServicePrices(employeeId: number): Promise<EmployeeServicePrice[]> {
  return apiFetch<EmployeeServicePrice[]>(`/employees/${employeeId}/service-prices`);
}

/** Upsert — sets or replaces this employee's price for this service. */
export function setEmployeeServicePrice(
  employeeId: number,
  serviceId: number,
  price: number,
): Promise<EmployeeServicePrice> {
  return apiFetch<EmployeeServicePrice>(`/employees/${employeeId}/service-prices/${serviceId}`, {
    method: 'PUT',
    body: { price },
  });
}
