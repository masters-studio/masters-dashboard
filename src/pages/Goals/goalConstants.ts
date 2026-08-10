/** Shared between GoalsList and GoalForm. */

export const HEBREW_MONTHS = [
  'ינואר',
  'פברואר',
  'מרץ',
  'אפריל',
  'מאי',
  'יוני',
  'יולי',
  'אוגוסט',
  'ספטמבר',
  'אוקטובר',
  'נובמבר',
  'דצמבר',
] as const;

/**
 * The four conventional goalType values from the source spreadsheet's own
 * goal-tracking sheet — see GoalRequest.java's javadoc. goalType is plain
 * free text on the backend (no lookup table, nothing enforces these), so
 * this is offered as a suggestion (via <datalist> on the form, and as
 * filter options on the list), not a hard constraint.
 */
export const GOAL_TYPE_SUGGESTIONS = ['יעד הכנסות', 'יעד רווחים', 'יעד הוצאות', 'יעד תזרים'] as const;
