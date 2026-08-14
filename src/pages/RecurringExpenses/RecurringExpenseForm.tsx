import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createRecurringExpense,
  getRecurringExpense,
  updateRecurringExpense,
  type RecurringExpenseRequest,
} from '../../api/recurringExpenses';
import { childrenOf, listCategories, topLevelOf, type Category } from '../../api/categories';
import { listSuppliers, type Supplier } from '../../api/suppliers';
import { listPaymentMethods, listProfitCenters, listVatTypes } from '../../api/lookups';
import type { SimpleLookup, VatTypeLookup } from '../../api/lookups';
import { translateApiError } from '../../api/errorMessages';
import styles from '../../styles/domainScreen.module.css';

interface FormState {
  name: string;
  amount: string;
  dayOfMonth: string;
  profitCenterId: string;
  categoryId: string;
  subcategoryId: string;
  supplierId: string;
  paymentMethodId: string;
  vatTypeId: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  amount: '',
  dayOfMonth: '',
  profitCenterId: '',
  categoryId: '',
  subcategoryId: '',
  supplierId: '',
  paymentMethodId: '',
  vatTypeId: '',
  notes: '',
};

/**
 * Shared create/edit form — mirrors RecurringExpenseRequest.java's shape.
 * active isn't editable here at all, same as Employee/Supplier/Category's
 * final form (2026-08-14): status only changes via the list's
 * activate/deactivate buttons.
 */
export default function RecurringExpenseForm() {
  const { id } = useParams();
  const isEdit = id != null;
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [profitCenters, setProfitCenters] = useState<SimpleLookup[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<SimpleLookup[]>([]);
  const [vatTypes, setVatTypes] = useState<VatTypeLookup[]>([]);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
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
      listVatTypes(),
    ])
      .then(([cats, sups, centers, methods, types]) => {
        setCategories(cats);
        setSuppliers(sups);
        setProfitCenters(centers);
        setPaymentMethods(methods);
        setVatTypes(types);
      })
      .catch((err) => setPageError(translateApiError(err)));
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    getRecurringExpense(Number(id))
      .then((r) => {
        setForm({
          name: r.name,
          amount: String(r.amount),
          dayOfMonth: String(r.dayOfMonth),
          profitCenterId: String(r.profitCenterId),
          categoryId: r.categoryId != null ? String(r.categoryId) : '',
          subcategoryId: r.subcategoryId != null ? String(r.subcategoryId) : '',
          supplierId: r.supplierId != null ? String(r.supplierId) : '',
          paymentMethodId: r.paymentMethodId != null ? String(r.paymentMethodId) : '',
          vatTypeId: String(r.vatTypeId),
          notes: r.notes ?? '',
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

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validate(): Partial<Record<keyof FormState, string>> {
    const errors: Partial<Record<keyof FormState, string>> = {};

    if (!form.name.trim()) errors.name = 'שם הוא שדה חובה';
    else if (form.name.length > 150) errors.name = 'שם ארוך מדי (עד 150 תווים)';

    const amount = Number(form.amount);
    if (!form.amount || Number.isNaN(amount) || amount <= 0) {
      errors.amount = 'יש להזין סכום תקין גדול מ-0';
    }

    const day = Number(form.dayOfMonth);
    if (!form.dayOfMonth || !Number.isInteger(day) || day < 1 || day > 31) {
      errors.dayOfMonth = 'יש להזין יום בחודש בין 1 ל-31';
    }

    if (!form.profitCenterId) errors.profitCenterId = 'יש לבחור מרכז רווח';
    if (!form.vatTypeId) errors.vatTypeId = 'יש לבחור סוג מע"מ';

    if (form.subcategoryId && !form.categoryId) {
      errors.subcategoryId = 'יש לבחור קטגוריה לפני בחירת תת-קטגוריה';
    }

    if (form.notes.length > 500) errors.notes = 'הערות ארוכות מדי (עד 500 תווים)';

    return errors;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPageError(null);
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const request: RecurringExpenseRequest = {
      name: form.name.trim(),
      amount: Number(form.amount),
      dayOfMonth: Number(form.dayOfMonth),
      profitCenterId: Number(form.profitCenterId),
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      subcategoryId: form.subcategoryId ? Number(form.subcategoryId) : null,
      supplierId: form.supplierId ? Number(form.supplierId) : null,
      paymentMethodId: form.paymentMethodId ? Number(form.paymentMethodId) : null,
      vatTypeId: Number(form.vatTypeId),
      active: null,
      notes: form.notes.trim() || null,
    };

    setSubmitting(true);
    try {
      if (isEdit) {
        await updateRecurringExpense(Number(id), request);
      } else {
        await createRecurringExpense(request);
      }
      navigate('/recurring-expenses');
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
          {isEdit ? 'עריכת הוצאה קבועה' : 'הוצאה קבועה חדשה'}
          <span className="dot" />
        </h1>
      </div>

      {pageError && <p className={styles.pageError}>{pageError}</p>}

      <div className={styles.formCard}>
        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.formGrid}>
            <label className={styles.field}>
              שם *
              <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} />
              {fieldErrors.name && <span className={styles.fieldError}>{fieldErrors.name}</span>}
              {!fieldErrors.name && (
                <span className={styles.hint}>למשל "חשבון טלפון ואינטרנט", "שכירות"</span>
              )}
            </label>

            <label className={styles.field}>
              סכום (₪) *
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => set('amount', e.target.value)}
              />
              {fieldErrors.amount && <span className={styles.fieldError}>{fieldErrors.amount}</span>}
            </label>

            <label className={styles.field}>
              יום בחודש *
              <input
                type="number"
                min="1"
                max="31"
                step="1"
                value={form.dayOfMonth}
                onChange={(e) => set('dayOfMonth', e.target.value)}
              />
              {fieldErrors.dayOfMonth ? (
                <span className={styles.fieldError}>{fieldErrors.dayOfMonth}</span>
              ) : (
                <span className={styles.hint}>
                  בכל חודש, ביום הזה, המערכת תרשום אוטומטית את ההוצאה
                </span>
              )}
            </label>

            <label className={styles.field}>
              מרכז רווח *
              <select value={form.profitCenterId} onChange={(e) => set('profitCenterId', e.target.value)}>
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
              אמצעי תשלום
              <select value={form.paymentMethodId} onChange={(e) => set('paymentMethodId', e.target.value)}>
                <option value="">ללא</option>
                {paymentMethods.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              סוג מע״מ *
              <select value={form.vatTypeId} onChange={(e) => set('vatTypeId', e.target.value)}>
                <option value="">בחר/י…</option>
                {vatTypes.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
              {fieldErrors.vatTypeId && <span className={styles.fieldError}>{fieldErrors.vatTypeId}</span>}
            </label>

            <label className={`${styles.field} ${styles.fieldFull}`}>
              הערות
              <textarea rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
              {fieldErrors.notes && <span className={styles.fieldError}>{fieldErrors.notes}</span>}
            </label>
          </div>

          <div className={styles.formActions}>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'שומר…' : isEdit ? 'שמירת שינויים' : 'יצירת הוצאה קבועה'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => navigate('/recurring-expenses')}>
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
