/** Shared between GoalsList and GoalForm. */

/**
 * The four conventional goalType values from the source spreadsheet's own
 * goal-tracking sheet — see GoalRequest.java's javadoc. goalType is plain
 * free text on the backend (no lookup table, nothing enforces these), so
 * this is offered as a suggestion (via <datalist> on the form, and as
 * filter options on the list), not a hard constraint.
 */
export const GOAL_TYPE_SUGGESTIONS = ['יעד הכנסות', 'יעד רווחים', 'יעד הוצאות', 'יעד תזרים'] as const;

/**
 * Which DashboardSummary field each conventional goalType compares against,
 * for the Dashboard's goal-vs-actual charts. Confirmed with the owner
 * (masters-dashboard-roadmap-2026-08 memory, item 2) — not gross, not
 * trueBusinessCost. יעד תזרים maps to the same netProfit figure as יעד
 * רווחים: the system has no distinct cash-basis metric (accrual-only), and
 * that overlap was accepted explicitly, not an oversight.
 *
 * A goalType outside these four (free text, nothing enforces the
 * suggestions) has no known metric to compare against, so it's simply
 * omitted from the charts — it still exists and is editable normally on the
 * Goals screen.
 */
export const GOAL_TYPE_METRIC: Record<string, 'totalIncomeNet' | 'totalExpensesNet' | 'netProfit'> = {
  'יעד הכנסות': 'totalIncomeNet',
  'יעד הוצאות': 'totalExpensesNet',
  'יעד רווחים': 'netProfit',
  'יעד תזרים': 'netProfit',
};
