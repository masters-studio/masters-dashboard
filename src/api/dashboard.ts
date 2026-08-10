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
