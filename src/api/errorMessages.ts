import { ApiError } from './client';

/**
 * Translates any error into Hebrew for display — the one place this happens,
 * reused by every screen. masters-api's own error messages
 * (GlobalExceptionHandler and every service's BusinessRuleViolationException/
 * ResourceNotFoundException) are deliberately kept in English on the backend:
 * they're developer-facing (server logs, debugging) first, and this API isn't
 * necessarily locked to one UI's language. Translation is this dashboard's
 * job, not the API's.
 *
 * Never returns backend English text verbatim — an unrecognized message
 * falls back to a generic Hebrew message rather than leaking English into
 * the UI, per the hard "fully Hebrew, no exceptions" requirement.
 */
export function translateApiError(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return GENERIC_FALLBACK;
  }

  const exact = EXACT_MESSAGES[error.message];
  if (exact) return exact;

  for (const [pattern, translation] of PATTERN_MESSAGES) {
    if (pattern.test(error.message)) return translation;
  }

  return GENERIC_FALLBACK;
}

/**
 * Exact backend message -> Hebrew, for the small set of messages that never
 * vary. Anything with an interpolated id/name (e.g. "No employee with id 7")
 * belongs in PATTERN_MESSAGES instead — matching those exactly here would
 * silently stop working the moment the interpolated value differs.
 */
const EXACT_MESSAGES: Record<string, string> = {
  'Invalid username or password': 'שם משתמש או סיסמה שגויים',
  'Validation failed': 'הנתונים שהוזנו אינם תקינים',
  'This operation conflicts with existing data (e.g. a duplicate code).':
    'הפעולה מתנגשת עם נתונים קיימים (למשל קוד כפול)',
  'Request body is not valid JSON, or its encoding is corrupted — ensure it is sent as UTF-8.':
    'אירעה שגיאה בשליחת הנתונים. נסו שוב.',
};

/**
 * Pattern -> Hebrew, for message SHAPES that recur across every domain
 * service with different entity names/ids each time. Order matters — first
 * match wins, so put more specific patterns before their more general
 * neighbors if that ever becomes ambiguous.
 */
const PATTERN_MESSAGES: [RegExp, string][] = [
  [/^No .+ with id \d+$/, 'הפריט שנבחר אינו קיים או נמחק'],
  [/^Missing required parameter/, 'חסר שדה חובה'],
  [/^Invalid value for parameter/, 'ערך לא תקין הוזן'],
  [/is required when/, 'שדה חובה חסר עבור האפשרות שנבחרה'],
  [/must not be set when/, 'שדה זה אינו רלוונטי עבור האפשרות שנבחרה'],
  [/is not applicable when/, 'שדה זה אינו רלוונטי עבור האפשרות שנבחרה'],
  [/is not a child of/, 'הבחירה אינה תואמת את הקטגוריה הראשית'],
  [/is itself a subcategory/, 'לא ניתן לבחור תת-קטגוריה ככטגוריית אב'],
  [/cannot be its own parent/, 'לא ניתן לבחור את הפריט עצמו כקטגוריית אב'],
  [/cannot exceed/, 'הערך שהוזן גבוה מהמותר'],
  [/does not match|belongs to a different/, 'הבחירה אינה תואמת את שאר הנתונים בטופס'],
];

const GENERIC_FALLBACK = 'אירעה שגיאה. נסו שוב, ואם הבעיה חוזרת פנו לתמיכה.';
