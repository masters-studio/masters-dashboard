import { apiFetch } from './client';

/**
 * Mirrors DashboardSummaryDto.java exactly. See DashboardService's class
 * javadoc for the scope decisions baked into these numbers:
 * - totalIncomeNet (total processed) and businessIncomeShare (what the
 *   business actually retains after percentage-employee cuts) are
 *   deliberately reported separately, never collapsed into one figure.
 * - netProfit = businessIncomeShare - totalExpensesTrueCost. There is no
 *   "gross profit" field -- its formula was unrecoverable in the source
 *   spreadsheet, so it's omitted rather than guessed.
 * - deductibleInputVat sums deductibleVat (the reclaimable portion), not
 *   raw vatAmount -- standard Israeli "מעמ תשומות" terminology.
 * - vatBalance = outputVat - deductibleInputVat.
 * - Accrual basis: every transaction dated within the month counts
 *   regardless of payment_status, not true cash-flow.
 */
export interface DashboardSummary {
  month: number;
  year: number;
  profitCenterId: number | null;

  totalIncomeGross: number;
  totalIncomeNet: number;
  businessIncomeShare: number;
  employeeShareTotal: number;

  totalExpensesGross: number;
  totalExpensesNet: number;
  totalExpensesTrueCost: number;

  outputVat: number;
  deductibleInputVat: number;
  vatBalance: number;

  netProfit: number;
}

export interface DashboardSummaryParams {
  month: number;
  year: number;
  profitCenterId?: number;
}

/** month/year are required -- a summary without a period isn't meaningful. */
export function getDashboardSummary(params: DashboardSummaryParams): Promise<DashboardSummary> {
  const search = new URLSearchParams();
  search.set('month', String(params.month));
  search.set('year', String(params.year));
  if (params.profitCenterId != null) search.set('profitCenterId', String(params.profitCenterId));
  return apiFetch<DashboardSummary>(`/dashboard/summary?${search.toString()}`);
}

/**
 * Mirrors EmployeeBreakdownRowDto.java exactly. employeeShare is null (not
 * zero) whenever compensationModelCode isn't 'PERCENTAGE' -- the system only
 * tracks a per-transaction employee cut for percentage-model employees, so a
 * FIXED_SALARY employee genuinely has no equivalent figure today. Render
 * that gap as "אין נתון", not "₪0".
 */
export interface EmployeeBreakdownRow {
  employeeId: number;
  employeeName: string;
  employeeTypeName: string;
  compensationModelCode: string;
  revenueGenerated: number;
  employeeShare: number | null;
  businessShare: number;
  transactionCount: number;
}

/** Mirrors EmployeeBreakdownDto.java. Excludes chair-renters (FIXED_AMOUNT) entirely. */
export interface EmployeeBreakdown {
  month: number;
  year: number;
  profitCenterId: number | null;
  employees: EmployeeBreakdownRow[];
}

export function getEmployeeBreakdown(params: DashboardSummaryParams): Promise<EmployeeBreakdown> {
  const search = new URLSearchParams();
  search.set('month', String(params.month));
  search.set('year', String(params.year));
  if (params.profitCenterId != null) search.set('profitCenterId', String(params.profitCenterId));
  return apiFetch<EmployeeBreakdown>(`/dashboard/employee-breakdown?${search.toString()}`);
}
