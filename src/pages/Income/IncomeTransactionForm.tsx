import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createIncomeTransaction,
  getIncomeTransaction,
  updateIncomeTransaction,
  type IncomeTransaction,
  type IncomeTransactionRequest,
} from '../../api/incomeTransactions';
import { childrenOf, listCategories, topLevelOf, type Category } from '../../api/categories';
import { listEmployees, type Employee } from '../../api/employees';
import { listPaymentMethods, listPaymentStatuses, listProfitCenters, listServices } from '../../api/lookups';
import type { ServiceLookup, SimpleLookup } from '../../api/lookups';
import { listEmployeeServicePrices, type EmployeeServicePrice } from '../../api/employeeServicePrices';
import { translateApiError } from '../../api/errorMessages';
import { DateField } from '../../components/DateField';
import styles from '../../styles/domainScreen.module.css';
import lineStyles from './ServiceLines.module.css';

const MASPERA_PROFIT_CENTER_NAME = 'מספרה';
const MASPERA_CATEGORY_NAME = 'שירותים';
const MASPERA_SUBCATEGORY_NAME = 'תספורות';

interface FormState {
  transactionNumber: string;
  transactionDate: string;
  employeeId: string;
  profitCenterId: string;
  categoryId: string;
  subcategoryId: string;
  grossAmount: string;
  /** Whole-number percent for display (e.g. "18"); converted to the 0-1
   *  fraction the API expects only at submit time. Blank = system default. */
  vatRatePercent: string;
  paymentMethodId: string;
  paymentStatusId: string;
  referenceNumber: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  transactionNumber: '',
  transactionDate: new Date().toISOString().slice(0, 10),
  employeeId: '',
  profitCenterId: '',
  categoryId: '',
  subcategoryId: '',
  grossAmount: '',
  vatRatePercent: '',
  paymentMethodId: '',
  paymentStatusId: '',
  referenceNumber: '',
  notes: '',
};

function formatCurrency(amount: number | null): string {
  if (amount == null) return '—';
  return `₪${amount.toLocaleString('he-IL')}`;
}

/**
 * Shared create/edit form — mirrors IncomeTransactionRequest.java's shape
 * exactly. Two rules replicated client-side from IncomeTransactionService:
 * category/subcategory only ever offer INCOME-side categories with the
 * usual parent-child scoping (same pattern as SupplierForm), and an
 * employee becomes required the moment the chosen category has
 * employeeRequired=true. Every derived amount (net/VAT/employee split) is
 * server-computed — this form never calculates them, only displays them
 * read-only once a saved transaction has them (edit mode).
 */
export default function IncomeTransactionForm() {
  const { id } = useParams();
  const isEdit = id != null;
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [profitCenters, setProfitCenters] = useState<SimpleLookup[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<SimpleLookup[]>([]);
  const [paymentStatuses, setPaymentStatuses] = useState<SimpleLookup[]>([]);
  const [services, setServices] = useState<ServiceLookup[]>([]);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saved, setSaved] = useState<IncomeTransaction | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [pageError, setPageError] = useState<string | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  // מספרה-only: replaces manual category/subcategory/amount entry with a
  // per-service customer count, priced from the chosen employee's own price
  // list (task from the owner, 2026-08-14) — create only, matches how
  // editing an already-saved single-amount row works everywhere else.
  const [servicePrices, setServicePrices] = useState<EmployeeServicePrice[]>([]);
  const [serviceCounts, setServiceCounts] = useState<Record<number, string>>({});

  useEffect(() => {
    Promise.all([
      listCategories({ type: 'INCOME' }),
      listEmployees(),
      listProfitCenters(),
      listPaymentMethods(),
      listPaymentStatuses(),
      listServices(),
    ])
      .then(([cats, emps, centers, methods, statuses, svcs]) => {
        setCategories(cats);
        setEmployees(emps);
        setProfitCenters(centers);
        setPaymentMethods(methods);
        setPaymentStatuses(statuses);
        setServices(svcs);
      })
      .catch((err) => setPageError(translateApiError(err)));
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    getIncomeTransaction(Number(id))
      .then((t) => {
        setSaved(t);
        setForm({
          transactionNumber: t.transactionNumber ?? '',
          transactionDate: t.transactionDate,
          employeeId: t.employeeId != null ? String(t.employeeId) : '',
          profitCenterId: String(t.profitCenterId),
          categoryId: t.categoryId != null ? String(t.categoryId) : '',
          subcategoryId: t.subcategoryId != null ? String(t.subcategoryId) : '',
          grossAmount: String(t.grossAmount),
          vatRatePercent: String(Math.round(t.vatRate * 10000) / 100),
          paymentMethodId: t.paymentMethodId != null ? String(t.paymentMethodId) : '',
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
  const selectedCategory = useMemo(
    () => categories.find((c) => String(c.id) === form.categoryId),
    [categories, form.categoryId],
  );
  const employeeRequiredByCategory = selectedCategory?.employeeRequired === true;

  const selectedProfitCenter = useMemo(
    () => profitCenters.find((c) => String(c.id) === form.profitCenterId),
    [profitCenters, form.profitCenterId],
  );
  // Create only — editing an already-saved transaction always shows the
  // plain amount field, even for a past מספרה entry.
  const isMaspera = !isEdit && selectedProfitCenter?.name === MASPERA_PROFIT_CENTER_NAME;
  const masperaEmployees = useMemo(
    () => employees.filter((e) => e.active && e.profitCenterId === selectedProfitCenter?.id),
    [employees, selectedProfitCenter],
  );
  const priceByServiceId = useMemo(
    () => new Map(servicePrices.map((p) => [p.serviceId, p.price])),
    [servicePrices],
  );

  useEffect(() => {
    if (!isMaspera || !form.employeeId) {
      setServicePrices([]);
      setServiceCounts({});
      return;
    }
    listEmployeeServicePrices(Number(form.employeeId))
      .then(setServicePrices)
      .catch((err) => setPageError(translateApiError(err)));
    setServiceCounts({});
  }, [isMaspera, form.employeeId]);

  function serviceLineGross(serviceId: number): number {
    const price = priceByServiceId.get(serviceId) ?? 0;
    const count = Number(serviceCounts[serviceId]) || 0;
    return price * count;
  }

  const masperaTotal = services.reduce((sum, s) => sum + serviceLineGross(s.id), 0);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validate(): Partial<Record<keyof FormState, string>> {
    const errors: Partial<Record<keyof FormState, string>> = {};

    if (!form.transactionDate) errors.transactionDate = 'תאריך הוא שדה חובה';
    if (!form.profitCenterId) errors.profitCenterId = 'יש לבחור מרכז רווח';
    if (!form.paymentStatusId) errors.paymentStatusId = 'יש לבחור סטטוס תשלום';

    // In מספרה mode the amount/category/subcategory/employee fields below
    // are replaced entirely by the service-count block — validated
    // separately by validateMaspera().
    if (!isMaspera) {
      const gross = Number(form.grossAmount);
      if (!form.grossAmount || Number.isNaN(gross) || gross <= 0) {
        errors.grossAmount = 'יש להזין סכום ברוטו תקין גדול מ-0';
      }

      if (form.subcategoryId && !form.categoryId) {
        errors.subcategoryId = 'יש לבחור קטגוריה לפני בחירת תת-קטגוריה';
      }

      if (employeeRequiredByCategory && !form.employeeId) {
        errors.employeeId = `יש לבחור עובד עבור הקטגוריה "${selectedCategory?.name}"`;
      }
    }

    if (form.vatRatePercent) {
      const vat = Number(form.vatRatePercent);
      if (Number.isNaN(vat) || vat < 0 || vat > 100) {
        errors.vatRatePercent = 'יש להזין אחוז מע"מ תקין בין 0 ל-100';
      }
    }

    if (form.transactionNumber.length > 30) errors.transactionNumber = 'ארוך מדי (עד 30 תווים)';
    if (form.referenceNumber.length > 50) errors.referenceNumber = 'ארוך מדי (עד 50 תווים)';
    if (form.notes.length > 500) errors.notes = 'הערות ארוכות מדי (עד 500 תווים)';

    return errors;
  }

  function validateMaspera(): string | null {
    if (!form.employeeId) return 'יש לבחור עובד/ת';
    const counted = services.filter((s) => Number(serviceCounts[s.id]) > 0);
    if (counted.length === 0) return 'יש להזין מספר לקוחות עבור לפחות שירות אחד';
    for (const service of counted) {
      const count = Number(serviceCounts[service.id]);
      if (!Number.isInteger(count) || count <= 0) {
        return 'מספר לקוחות חייב להיות מספר שלם גדול מ-0';
      }
      if (!priceByServiceId.has(service.id)) {
        return `לא הוגדר מחיר עבור "${service.name}" לעובד/ת זו — יש להגדיר מחירון בעמוד העובד/ת`;
      }
    }
    const category = categories.find((c) => c.name === MASPERA_CATEGORY_NAME);
    const subcategory = categories.find((c) => c.name === MASPERA_SUBCATEGORY_NAME);
    if (!category || !subcategory) return 'לא נמצאה קטגוריית "שירותים / תספורות"';
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPageError(null);
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    if (isMaspera) {
      const masperaError = validateMaspera();
      if (masperaError) {
        setPageError(masperaError);
        return;
      }

      setSubmitting(true);
      try {
        const category = categories.find((c) => c.name === MASPERA_CATEGORY_NAME)!;
        const subcategory = categories.find((c) => c.name === MASPERA_SUBCATEGORY_NAME)!;
        const counted = services.filter((s) => Number(serviceCounts[s.id]) > 0);
        // One transaction per service, not one combined row — matches the
        // one-row-per-transaction convention everywhere else in the app and
        // keeps per-service reporting clean.
        for (const service of counted) {
          const request: IncomeTransactionRequest = {
            transactionNumber: form.transactionNumber.trim() || null,
            transactionDate: form.transactionDate,
            employeeId: Number(form.employeeId),
            profitCenterId: Number(form.profitCenterId),
            categoryId: category.id,
            subcategoryId: subcategory.id,
            grossAmount: serviceLineGross(service.id),
            vatRate: form.vatRatePercent ? Number(form.vatRatePercent) / 100 : null,
            paymentMethodId: form.paymentMethodId ? Number(form.paymentMethodId) : null,
            paymentStatusId: Number(form.paymentStatusId),
            referenceNumber: form.referenceNumber.trim() || null,
            notes: form.notes.trim() || `${service.name} × ${serviceCounts[service.id]}`,
          };
          await createIncomeTransaction(request);
        }
        navigate('/income');
      } catch (err) {
        setPageError(translateApiError(err));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const request: IncomeTransactionRequest = {
      transactionNumber: form.transactionNumber.trim() || null,
      transactionDate: form.transactionDate,
      employeeId: form.employeeId ? Number(form.employeeId) : null,
      profitCenterId: Number(form.profitCenterId),
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      subcategoryId: form.subcategoryId ? Number(form.subcategoryId) : null,
      grossAmount: Number(form.grossAmount),
      vatRate: form.vatRatePercent ? Number(form.vatRatePercent) / 100 : null,
      paymentMethodId: form.paymentMethodId ? Number(form.paymentMethodId) : null,
      paymentStatusId: Number(form.paymentStatusId),
      referenceNumber: form.referenceNumber.trim() || null,
      notes: form.notes.trim() || null,
    };

    setSubmitting(true);
    try {
      if (isEdit) {
        await updateIncomeTransaction(Number(id), request);
      } else {
        await createIncomeTransaction(request);
      }
      navigate('/income');
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
          {isEdit ? 'עריכת עסקת הכנסה' : 'עסקת הכנסה חדשה'}
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
            <span className={styles.computedLabel}>חלק עובד</span>
            <span className={styles.computedValue}>{formatCurrency(saved.employeeShare)}</span>
          </div>
          <div className={styles.computedItem}>
            <span className={styles.computedLabel}>חלק עסק</span>
            <span className={styles.computedValue}>{formatCurrency(saved.businessShare)}</span>
          </div>
          {saved.calculationBasisSnapshot && (
            <div className={styles.computedItem}>
              <span className={styles.computedLabel}>בסיס חישוב (בעת השמירה)</span>
              <span className={styles.computedValue}>{saved.calculationBasisSnapshot}</span>
            </div>
          )}
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
                value={form.transactionDate}
                onChange={(v) => set('transactionDate', v)}
                required
              />
              {fieldErrors.transactionDate && (
                <span className={styles.fieldError}>{fieldErrors.transactionDate}</span>
              )}
            </div>

            <label className={styles.field}>
              מספר עסקה
              <input
                type="text"
                value={form.transactionNumber}
                onChange={(e) => set('transactionNumber', e.target.value)}
              />
              {fieldErrors.transactionNumber && (
                <span className={styles.fieldError}>{fieldErrors.transactionNumber}</span>
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

            {!isMaspera && (
              <>
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
                  עובד {employeeRequiredByCategory && '*'}
                  <select value={form.employeeId} onChange={(e) => set('employeeId', e.target.value)}>
                    <option value="">ללא</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.employeeId && (
                    <span className={styles.fieldError}>{fieldErrors.employeeId}</span>
                  )}
                  {employeeRequiredByCategory && !fieldErrors.employeeId && (
                    <span className={styles.hint}>קטגוריה זו דורשת שיוך עובד</span>
                  )}
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
              </>
            )}

            {isMaspera && (
              <label className={styles.field}>
                עובד/ת *
                <select value={form.employeeId} onChange={(e) => set('employeeId', e.target.value)}>
                  <option value="">בחר/י…</option>
                  {masperaEmployees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
                {masperaEmployees.length === 0 && (
                  <span className={styles.hint}>אין עובדים פעילים במרכז הרווח "מספרה"</span>
                )}
              </label>
            )}

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

          {isMaspera && form.employeeId && (
            <div className={lineStyles.lines}>
              <div className={lineStyles.linesHeader}>
                <span>שירותים</span>
              </div>

              {services.length === 0 ? (
                <p className={styles.hint}>טוען שירותים…</p>
              ) : priceByServiceId.size === 0 ? (
                <p className={styles.hint}>
                  לא הוגדר מחירון לעובד/ת זו — יש להגדיר מחירים בעמוד העובד/ת לפני הזנת הכנסה.
                </p>
              ) : (
                services.map((service) => {
                  const price = priceByServiceId.get(service.id);
                  const count = serviceCounts[service.id] ?? '';
                  return (
                    <div key={service.id} className={lineStyles.lineRow}>
                      <span>{service.name}</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="מספר לקוחות"
                        value={count}
                        onChange={(e) =>
                          setServiceCounts((c) => ({ ...c, [service.id]: e.target.value }))
                        }
                        className={lineStyles.countInput}
                        disabled={price == null}
                      />
                      <span className={lineStyles.lineNote}>
                        {price != null
                          ? `${formatCurrency(price)} × ${count || 0} = `
                          : 'אין מחיר'}
                        {price != null && <strong>{formatCurrency(serviceLineGross(service.id))}</strong>}
                      </span>
                    </div>
                  );
                })
              )}

              {priceByServiceId.size > 0 && (
                <div className={lineStyles.total}>סה״כ: {formatCurrency(masperaTotal)}</div>
              )}
            </div>
          )}

          <div className={styles.formActions}>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'שומר…' : isEdit ? 'שמירת שינויים' : 'יצירת עסקה'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => navigate('/income')}>
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
