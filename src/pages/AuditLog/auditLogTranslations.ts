/**
 * The audit trail stores raw data, not UI copy: entityType is a hand-picked
 * English constant per service (e.g. "Employee"), fieldName is a Java DTO
 * record component name pulled via reflection (e.g. "compensationPercentage"
 * — see masters-api's DtoDiffer.java), and old/new values are raw
 * `.toString()` output. None of that is written with an audience in mind,
 * but it still renders in this dashboard, so it still falls under the hard
 * "100% Hebrew, no English anywhere" requirement — same reasoning as
 * errorMessages.ts's translateApiError, just for audit data instead of
 * error responses.
 *
 * ENTITY_TYPE_LABELS / ACTION_LABELS / FIELD_LABELS are keyed by the exact
 * strings each backend service writes (see each service's ENTITY_TYPE
 * constant, AuditLogService's ACTION_* constants, and each response DTO's
 * record component names) — verify against those sources before adding a
 * new one, don't guess the spelling.
 */

export const ENTITY_TYPE_LABELS: Record<string, string> = {
  Employee: 'עובד',
  Supplier: 'ספק',
  Category: 'קטגוריה',
  IncomeTransaction: 'עסקת הכנסה',
  ExpenseTransaction: 'עסקת הוצאה',
  Goal: 'יעד',
  RecurringExpense: 'הוצאה קבועה',
};

export const ACTION_LABELS: Record<string, string> = {
  CREATE: 'יצירה',
  UPDATE: 'עדכון',
  DELETE: 'מחיקה',
};

/** entityType -> the route each links to, for the entityId cross-navigation link. */
export const ENTITY_ROUTES: Record<string, string> = {
  Employee: '/employees',
  Supplier: '/suppliers',
  Category: '/categories',
  IncomeTransaction: '/income',
  ExpenseTransaction: '/expenses',
  Goal: '/goals',
  RecurringExpense: '/recurring-expenses',
};

/**
 * Every record component name that can appear as fieldName across all six
 * writable DTOs (EmployeeDto, SupplierDto, CategoryDto, IncomeTransactionDto,
 * ExpenseTransactionDto, GoalDto) — deliberately one flat dictionary since
 * most names (id, name, active, notes, profitCenterId, ...) are shared
 * across several domains.
 */
export const FIELD_LABELS: Record<string, string> = {
  id: 'מזהה',
  name: 'שם',
  active: 'פעיל',
  notes: 'הערות',
  createdAt: 'נוצר בתאריך',
  updatedAt: 'עודכן בתאריך',
  createdBy: 'נוצר על ידי',
  updatedBy: 'עודכן על ידי',
  deletedAt: 'נמחק בתאריך',
  profitCenterId: 'מרכז רווח',
  categoryId: 'קטגוריה',
  subcategoryId: 'תת-קטגוריה',
  paymentMethodId: 'אמצעי תשלום',
  paymentTermsId: 'תנאי תשלום',
  paymentStatusId: 'סטטוס תשלום',
  grossAmount: 'סכום ברוטו',
  netAmount: 'סכום נטו',
  vatAmount: 'סכום מע"מ',
  vatRate: 'אחוז מע"מ',
  referenceNumber: 'מספר אסמכתא',
  employeeId: 'עובד',
  supplierId: 'ספק',

  // Employee
  employeeCode: 'קוד עובד',
  employeeTypeId: 'סוג עובד',
  compensationModelId: 'מודל תגמול',
  compensationPercentage: 'אחוז תגמול',
  fixedAmount: 'סכום קבוע',
  calculationBasisId: 'בסיס חישוב',
  settlementTypeId: 'סוג התחשבנות',

  // Supplier
  supplierCode: 'קוד ספק',
  supplierType: 'סוג ספק',
  expenseNatureId: 'אופי הוצאה',

  // Category
  type: 'סוג',
  parentCategoryId: 'קטגוריית אב',
  budget: 'תקציב',
  employeeRequired: 'דורש שיוך עובד',

  // Income transaction
  transactionNumber: 'מספר עסקה',
  transactionDate: 'תאריך עסקה',
  calculationBasisSnapshot: 'בסיס חישוב (בעת הרישום)',
  employeePercentageSnapshot: 'אחוז עובד (בעת הרישום)',
  compensationModelSnapshot: 'מודל תגמול (בעת הרישום)',
  employeeTypeSnapshot: 'סוג עובד (בעת הרישום)',
  profitCenterSnapshot: 'מרכז רווח (בעת הרישום)',
  employeeShare: 'חלק עובד',
  businessShare: 'חלק עסק',

  // Expense transaction
  expenseNumber: 'מספר הוצאה',
  expenseDate: 'תאריך הוצאה',
  vatTypeId: 'סוג מע"מ',
  deductibleVat: 'מע"מ ניתן לניכוי',
  trueBusinessCost: 'עלות אמיתית לעסק',
  invoiceSubmitted: 'הגשה לרו"ח',
  recurringExpenseId: 'הוצאה קבועה מקושרת',

  // Goal
  month: 'חודש',
  year: 'שנה',
  goalType: 'סוג יעד',
  targetAmount: 'סכום יעד',

  // Recurring expense
  amount: 'סכום',
  dayOfMonth: 'יום בחודש',
};

/**
 * The small, finite set of raw English tokens that can appear as an old/new
 * VALUE (not a field name) — booleans, and CategoryDto's `type` enum
 * (INCOME/EXPENSE, the one enum exposed directly on a writable DTO rather
 * than behind a lookup id). Everything else (numbers, decimals, dates,
 * free-text names) passes through unchanged — those aren't English words,
 * they're data, same as amounts/dates shown unTranslated everywhere else
 * in this dashboard.
 */
const VALUE_LABELS: Record<string, string> = {
  true: 'כן',
  false: 'לא',
  INCOME: 'הכנסה',
  EXPENSE: 'הוצאה',
};

export function translateFieldName(fieldName: string | null): string {
  if (fieldName == null) return '—';
  return FIELD_LABELS[fieldName] ?? fieldName;
}

export function translateValue(value: string | null): string {
  if (value == null) return '—';
  return VALUE_LABELS[value] ?? value;
}

export function translateEntityType(entityType: string): string {
  return ENTITY_TYPE_LABELS[entityType] ?? entityType;
}

export function translateAction(action: string): string {
  return ACTION_LABELS[action] ?? action;
}
