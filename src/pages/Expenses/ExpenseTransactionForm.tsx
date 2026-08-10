import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createExpenseTransaction,
  getExpenseTransaction,
  updateExpenseTransaction,
  type ExpenseTransaction,
  type ExpenseTransactionRequest,
} from '../../api/expenseTransactions';
import { childrenOf, listCategories, topLevelOf, type Category } from '../../api/categories';
import { listSuppliers, type Supplier } from '../../api/suppliers';
import {
  listPaymentMethods,
  listPaymentStatuses,
  listPaymentTerms,
  listProfitCenters,
  listVatTypes,
} from '../../api/lookups';
import type { SimpleLookup, VatTypeLookup } from '../../api/lookups';
import { translateApiError } from '../../api/errorMessages';
import { DateField } from '../../components/DateField';
import styles from '../../styles/domainScreen.module.css';

interface FormState {
  expenseNumber: string;
  expenseDate: string;
  supplierId: string;
  profitCenterId: string;
  categoryId: string;
  subcategoryId: string;
  paymentMethodId: string;
  paymentTermsId: string;
  grossAmount: string;
  /** Whole-number percent for display; converted to the 0-1 fraction the
   *  API expects only at submit time. Blank = system default. */
  vatRatePercent: string;
  vatTypeId: string;
  deductibleVat: string;
  paymentStatusId: string;
  referenceNumber: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  expenseNumber: '',
  expenseDate: new Date().toISOString().slice(0, 10),
  supplierId: '',
  profitCenterId: '',
  categoryId: '',
  subcategoryId: '',
  paymentMethodId: '',
  paymentTermsId: '',
  grossAmount: '',
  vatRatePercent: '',
  vatTypeId: '',
  deductibleVat: '',
  paymentStatusId: '',
  referenceNumber: '',
  notes: '',
};

/** Only a display fallback for the live estimate hint — matches
 *  ExpenseTransactionService's own FALLBACK_VAT_RATE. The server is always
 *  the authority on the real system default. */
const FALLBACK_VAT_RATE = 0.18;

function formatCurrency(amount: number | null): string {
  if (amount == null) return '—';
  return `₪${amount.toLocaleString('he-IL')}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Shared create/edit form — mirrors ExpenseTransactionRequest.java's shape
 * exactly. Rules replicated client-side from ExpenseTransactionService:
 * category/subcategory only ever offer EXPENSE-side categories (usual
 * parent-child scoping), and deductibleVat's shape depends on the chosen
 * VAT type — hidden for FULL/NONE (server computes it), required and
 * bounded to the estimated VAT amount for PARTIAL (Israeli partial VAT
 * deductibility has no fixed formula, see the service's class javadoc).
 * netAmount/vatAmount/trueBusinessCost are always server-computed; this
 * form only estimates them live for the deductibleVat hint, and displays
 * the real saved values read-only once a transaction has them (edit mode).
 */
export default function ExpenseTransactionForm() {
  const { id } = useParams();
  const isEdit = id != null;
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [profitCenters, setProfitCenters] = useState<SimpleLookup[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<SimpleLookup[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<SimpleLookup[]>([]);
  const [paymentStatuses, setPaymentStatuses] = useState<SimpleLookup[]>([]);
  const [vatTypes, setVatTypes] = useState<VatTypeLookup[]>([]);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saved, setSaved] = useState<ExpenseTransaction | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [pageError, setPageError] = useState<string | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      listCategories({ type: 'EXPENSE' }),
      listSuppliers(),
      listProfitCenters(),
      listPaymentMethods(),
      listPaymentTerms(),
      listPaymentStatuses(),
      listVatTypes(),
    ])
      .then(([cats, sups, centers, methods, terms, statuses, types]) => {
        setCategories(cats);
        setSuppliers(sups);
        setProfitCenters(centers);
        setPaymentMethods(methods);
        setPaymentTerms(terms);
        setPaymentStatuses(statuses);
        setVatTypes(types);
      })
      .catch((err) => setPageError(translateApiError(err)));
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    getExpenseTransaction(Number(id))
      .then((t) => {
        setSaved(t);
        // This table has no stored VAT-rate column (see the entity's
        // javadoc) -- reconstruct the implied rate from the saved net/VAT
        // amounts so a plain re-save reproduces the same split instead of
        // silently drifting to today's system default.
        const impliedVatRate = t.netAmount > 0 ? t.vatAmount / t.netAmount : null;
        setForm({
          expenseNumber: t.expenseNumber ?? '',
          expenseDate: t.expenseDate,
          supplierId: t.supplierId != null ? String(t.supplierId) : '',
          profitCenterId: String(t.profitCenterId),
          categoryId: t.categoryId != null ? String(t.categoryId) : '',
          subcategoryId: t.subcategoryId != null ? String(t.subcategoryId) : '',
          paymentMethodId: t.paymentMethodId != null ? String(t.paymentMethodId) : '',
          paymentTermsId: t.paymentTermsId != null ? String(t.paymentTermsId) : '',
          grossAmount: String(t.grossAmount),
          vatRatePercent: impliedVatRate != null ? String(round2(impliedVatRate * 100)) : '',
          vatTypeId: String(t.vatTypeId),
          deductibleVat: String(t.deductibleVat),
          paymentStatusId: String(t.paymentStatusId),
          referenceNumber: t.referenceNumber ?? '',
          notes: t.notes ?? '',
        });
      })
      .catch((err) => setPageError(translateApiError(err)))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const topLevelCategories = useMemo(() => topLevelOf(categories), [categories]);
  const availableSubcategories = useMemo(
    () => (form.categoryId ? childrenOf(categories, Number(form.categoryId)) : []),
    [categories, form.categoryId],
  );
  const selectedVatType = useMemo(
    () => vatTypes.find((v) => String(v.id) === form.vatTypeId),
    [vatTypes, form.vatTypeId],
  );
  const isPartialVat = selectedVatType?.code === 'PARTIAL';

  // Live estimate only -- for the deductibleVat hint/bound. The server is
  // always the real authority (it may use a different current default rate
  // than FALLBACK_VAT_RATE assumes here).
  const estimatedVat = useMemo(() => {
    const gross = Number(form.grossAmount);
    if (!form.grossAmount || Number.isNaN(gross) || gross <= 0) return null;
    const rate = form.vatRatePercent ? Number(form.vatRatePercent) / 100 : FALLBACK_VAT_RATE;
    const net = round2(gross / (1 + rate));
    return round2(gross - net);
  }, [form.grossAmount, form.vatRatePercent]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validate(): Partial<Record<keyof FormState, string>> {
    const errors: Partial<Record<keyof FormState, string>> = {};

    if (!form.expenseDate) errors.expenseDate = 'תאריך הוא שדה חובה';
    if (!form.profitCenterId) errors.profitCenterId = 'יש לבחור מרכז רווח';
    if (!form.vatTypeId) errors.vatTypeId = 'יש לבחור סוג מע"מ';
    if (!form.paymentStatusId) errors.paymentStatusId = 'יש לבחור סטטוס תשלום';

    const gross = Number(form.grossAmount);
    if (!form.grossAmount || Number.isNaN(gross) || gross <= 0) {
      errors.grossAmount = 'יש להזין סכום ברוטו תקין גדול מ-0';
    }

    if (form.vatRatePercent) {
      const vat = Number(form.vatRatePercent);
      if (Number.isNaN(vat) || vat < 0 || vat > 100) {
        errors.vatRatePercent = 'יש להזין אחוז מע"מ תקין בין 0 ל-100';
      }
    }

    if (isPartialVat) {
      const ded = Number(form.deductibleVat);
      if (!form.deductibleVat || Number.isNaN(ded) || ded < 0) {
        errors.deductibleVat = 'יש להזין סכום מע"מ ניתן לניכוי (0 ומעלה)';
      } else if (estimatedVat != null && ded > estimatedVat) {
        errors.deductibleVat = `הסכום גבוה מהמע"מ המשוער (₪${estimatedVat.toLocaleString('he-IL')})`;
      }
    }

    if (form.subcategoryId && !form.categoryId) {
      errors.subcategoryId = 'יש לבחור קטגוריה לפני בחירת תת-קטגוריה';
    }

    if (form.expenseNumber.length > 30) errors.expenseNumber = 'ארוך מדי (עד 30 תווים)';
    if (form.referenceNumber.length > 50) errors.referenceNumber = 'ארוך מדי (עד 50 תווים)';
    if (form.notes.length > 500) errors.notes = 'הערות ארוכות מדי (עד 500 תווים)';

    return errors;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPageError(null);
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const request: ExpenseTransactionRequest = {
      expenseNumber: form.expenseNumber.trim() || null,
      expenseDate: form.expenseDate,
      supplierId: form.supplierId ? Number(form.supplierId) : null,
      profitCenterId: Number(form.profitCenterId),
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      subcategoryId: form.subcategoryId ? Number(form.subcategoryId) : null,
      paymentMethodId: form.paymentMethodId ? Number(form.paymentMethodId) : null,
      paymentTermsId: form.paymentTermsId ? Number(form.paymentTermsId) : null,
      grossAmount: Number(form.grossAmount),
      vatRate: form.vatRatePercent ? Number(form.vatRatePercent) / 100 : null,
      vatTypeId: Number(form.vatTypeId),
      deductibleVat: isPartialVat && form.deductibleVat ? Number(form.deductibleVat) : null,
      paymentStatusId: Number(form.paymentStatusId),
      referenceNumber: form.referenceNumber.trim() || null,
      notes: form.notes.trim() || null,
    };

    setSubmitting(true);
    try {
      if (isEdit) {
        await updateExpenseTransaction(Number(id), request);
      } else {
        await createExpenseTransaction(request);
      }
      navigate('/expenses');
    } catch (err) {
      setPageError(translateApiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className={styles.hint}>טוען…</p>;
  }

  return (
    <div>
      <div className={styles.header}>
        <h1>
          {isEdit ? 'עריכת הוצאה' : 'הוצאה חדשה'}
          <span className="dot" />
        </h1>
      </div>

      {pageError && <p className={styles.pageError}>{pageError}</p>}

      {isEdit && saved && (
        <div className={styles.computedPanel}>
          <div className={styles.computedItem}>
            <span className={styles.computedLabel}>נטו</span>
            <span className={styles.computedValue}>{formatCurrency(saved.netAmount)}</span>
          </div>
          <div className={styles.computedItem}>
            <span className={styles.computedLabel}>מע״מ</span>
            <span className={styles.computedValue}>{formatCurrency(saved.vatAmount)}</span>
          </div>
          <div className={styles.computedItem}>
            <span className={styles.computedLabel}>מע״מ ניתן לניכוי</span>
            <span className={styles.computedValue}>{formatCurrency(saved.deductibleVat)}</span>
          </div>
          <div className={styles.computedItem}>
            <span className={styles.computedLabel}>עלות אמיתית לעסק</span>
            <span className={styles.computedValue}>{formatCurrency(saved.trueBusinessCost)}</span>
          </div>
        </div>
      )}

      <div className={styles.formCard}>
        {/* noValidate: our own Hebrew validation messages, same convention
            as every other domain form. */}
        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <DateField
                label="תאריך *"
                value={form.expenseDate}
                onChange={(v) => set('expenseDate', v)}
                required
              />
              {fieldErrors.expenseDate && (
                <span className={styles.fieldError}>{fieldErrors.expenseDate}</span>
              )}
            </div>

            <label className={styles.field}>
              מספר הוצאה
              <input
                type="text"
                value={form.expenseNumber}
                onChange={(e) => set('expenseNumber', e.target.value)}
              />
              {fieldErrors.expenseNumber && (
                <span className={styles.fieldError}>{fieldErrors.expenseNumber}</span>
              )}
            </label>

            <label className={styles.field}>
              מרכז רווח *
              <select
                value={form.profitCenterId}
                onChange={(e) => set('profitCenterId', e.target.value)}
              >
                <option value="">בחר/י…</option>
                {profitCenters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {fieldErrors.profitCenterId && (
                <span className={styles.fieldError}>{fieldErrors.profitCenterId}</span>
              )}
            </label>

            <label className={styles.field}>
              ספק
              <select value={form.supplierId} onChange={(e) => set('supplierId', e.target.value)}>
                <option value="">ללא</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              קטגוריה
              <select
                value={form.categoryId}
                onChange={(e) => {
                  set('categoryId', e.target.value);
                  set('subcategoryId', '');
                }}
              >
                <option value="">ללא</option>
                {topLevelCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              תת-קטגוריה
              <select
                value={form.subcategoryId}
                onChange={(e) => set('subcategoryId', e.target.value)}
                disabled={!form.categoryId}
              >
                <option value="">ללא</option>
                {availableSubcategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {fieldErrors.subcategoryId && (
                <span className={styles.fieldError}>{fieldErrors.subcategoryId}</span>
              )}
              {!form.categoryId && <span className={styles.hint}>יש לבחור קטגוריה תחילה</span>}
            </label>

            <label className={styles.field}>
              סכום ברוטו (₪) *
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.grossAmount}
                onChange={(e) => set('grossAmount', e.target.value)}
              />
              {fieldErrors.grossAmount && (
                <span className={styles.fieldError}>{fieldErrors.grossAmount}</span>
              )}
            </label>

            <label className={styles.field}>
              אחוז מע״מ (%)
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                placeholder="ברירת מחדל של המערכת"
                value={form.vatRatePercent}
                onChange={(e) => set('vatRatePercent', e.target.value)}
              />
              {fieldErrors.vatRatePercent && (
                <span className={styles.fieldError}>{fieldErrors.vatRatePercent}</span>
              )}
              {!form.vatRatePercent && <span className={styles.hint}>ריק = ברירת המחדל של המערכת</span>}
            </label>

            <label className={styles.field}>
              סוג מע״מ *
              <select
                value={form.vatTypeId}
                onChange={(e) => {
                  // FULL/NONE forbid deductibleVat, PARTIAL requires it --
                  // clear it so a stale value from the previous type is
                  // never silently submitted.
                  set('vatTypeId', e.target.value);
                  set('deductibleVat', '');
                }}
              >
                <option value="">בחר/י…</option>
                {vatTypes.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
              {fieldErrors.vatTypeId && <span className={styles.fieldError}>{fieldErrors.vatTypeId}</span>}
            </label>

            {isPartialVat && (
              <label className={styles.field}>
                מע״מ ניתן לניכוי (₪) *
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.deductibleVat}
                  onChange={(e) => set('deductibleVat', e.target.value)}
                />
                {fieldErrors.deductibleVat && (
                  <span className={styles.fieldError}>{fieldErrors.deductibleVat}</span>
                )}
                {!fieldErrors.deductibleVat && estimatedVat != null && (
                  <span className={styles.hint}>
                    מע״מ משוער על הסכום: ₪{estimatedVat.toLocaleString('he-IL')}
                  </span>
                )}
              </label>
            )}

            <label className={styles.field}>
              אמצעי תשלום
              <select
                value={form.paymentMethodId}
                onChange={(e) => set('paymentMethodId', e.target.value)}
              >
                <option value="">ללא</option>
                {paymentMethods.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              תנאי תשלום
              <select
                value={form.paymentTermsId}
                onChange={(e) => set('paymentTermsId', e.target.value)}
              >
                <option value="">ללא</option>
                {paymentTerms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              סטטוס תשלום *
              <select
                value={form.paymentStatusId}
                onChange={(e) => set('paymentStatusId', e.target.value)}
              >
                <option value="">בחר/י…</option>
                {paymentStatuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {fieldErrors.paymentStatusId && (
                <span className={styles.fieldError}>{fieldErrors.paymentStatusId}</span>
              )}
            </label>

            <label className={styles.field}>
              מספר אסמכתא
              <input
                type="text"
                value={form.referenceNumber}
                onChange={(e) => set('referenceNumber', e.target.value)}
              />
              {fieldErrors.referenceNumber && (
                <span className={styles.fieldError}>{fieldErrors.referenceNumber}</span>
              )}
            </label>

            <label className={`${styles.field} ${styles.fieldFull}`}>
              הערות
              <textarea rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
              {fieldErrors.notes && <span className={styles.fieldError}>{fieldErrors.notes}</span>}
            </label>
          </div>

          <div className={styles.formActions}>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'שומר…' : isEdit ? 'שמירת שינויים' : 'יצירת הוצאה'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => navigate('/expenses')}>
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
