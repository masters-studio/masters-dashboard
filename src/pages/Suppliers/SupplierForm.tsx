import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createSupplier, getSupplier, updateSupplier, type SupplierRequest } from '../../api/suppliers';
import { childrenOf, listCategories, topLevelOf, type Category } from '../../api/categories';
import { listExpenseNatures, listPaymentMethods, listPaymentTerms } from '../../api/lookups';
import type { SimpleLookup } from '../../api/lookups';
import { translateApiError } from '../../api/errorMessages';
import styles from '../../styles/domainScreen.module.css';

interface FormState {
  supplierCode: string;
  name: string;
  categoryId: string;
  subcategoryId: string;
  supplierType: string;
  paymentTermsId: string;
  paymentMethodId: string;
  expenseNatureId: string;
  active: boolean;
  notes: string;
}

const EMPTY_FORM: FormState = {
  supplierCode: '',
  name: '',
  categoryId: '',
  subcategoryId: '',
  supplierType: '',
  paymentTermsId: '',
  paymentMethodId: '',
  expenseNatureId: '',
  active: true,
  notes: '',
};

/**
 * Shared create/edit form — mirrors SupplierRequest.java's shape exactly and
 * replicates SupplierService's rule client-side: category/subcategory are
 * only ever offered from the EXPENSE side of the category tree (suppliers
 * are who the business pays, never a source of income — see
 * SupplierService's class javadoc), and a subcategory can only be chosen
 * once its parent category is, matching resolveSubcategory()'s
 * "categoryId is required when subcategoryId is set" rule.
 */
export default function SupplierForm() {
  const { id } = useParams();
  const isEdit = id != null;
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<SimpleLookup[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<SimpleLookup[]>([]);
  const [expenseNatures, setExpenseNatures] = useState<SimpleLookup[]>([]);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [pageError, setPageError] = useState<string | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      listCategories({ type: 'EXPENSE' }),
      listPaymentTerms(),
      listPaymentMethods(),
      listExpenseNatures(),
    ])
      .then(([cats, terms, methods, natures]) => {
        setCategories(cats);
        setPaymentTerms(terms);
        setPaymentMethods(methods);
        setExpenseNatures(natures);
      })
      .catch((err) => setPageError(translateApiError(err)));
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    getSupplier(Number(id))
      .then((supplier) => {
        setForm({
          supplierCode: supplier.supplierCode ?? '',
          name: supplier.name,
          categoryId: supplier.categoryId != null ? String(supplier.categoryId) : '',
          subcategoryId: supplier.subcategoryId != null ? String(supplier.subcategoryId) : '',
          supplierType: supplier.supplierType ?? '',
          paymentTermsId: supplier.paymentTermsId != null ? String(supplier.paymentTermsId) : '',
          paymentMethodId: supplier.paymentMethodId != null ? String(supplier.paymentMethodId) : '',
          expenseNatureId: supplier.expenseNatureId != null ? String(supplier.expenseNatureId) : '',
          active: supplier.active,
          notes: supplier.notes ?? '',
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
    else if (form.name.length > 100) errors.name = 'שם ארוך מדי (עד 100 תווים)';

    if (form.supplierCode.length > 20) errors.supplierCode = 'קוד ארוך מדי (עד 20 תווים)';
    if (form.supplierType.length > 50) errors.supplierType = 'טקסט ארוך מדי (עד 50 תווים)';
    if (form.notes.length > 500) errors.notes = 'הערות ארוכות מדי (עד 500 תווים)';

    // Mirrors resolveSubcategory(): a subcategory can't exist without its
    // parent category. The select is disabled until a category is chosen,
    // so this mainly guards against a stale value surviving a category
    // change that didn't go through the onChange clearing logic below.
    if (form.subcategoryId && !form.categoryId) {
      errors.subcategoryId = 'יש לבחור קטגוריה לפני בחירת תת-קטגוריה';
    }

    return errors;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPageError(null);
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const request: SupplierRequest = {
      supplierCode: form.supplierCode.trim() || null,
      name: form.name.trim(),
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      subcategoryId: form.subcategoryId ? Number(form.subcategoryId) : null,
      supplierType: form.supplierType.trim() || null,
      paymentTermsId: form.paymentTermsId ? Number(form.paymentTermsId) : null,
      paymentMethodId: form.paymentMethodId ? Number(form.paymentMethodId) : null,
      expenseNatureId: form.expenseNatureId ? Number(form.expenseNatureId) : null,
      active: form.active,
      notes: form.notes.trim() || null,
    };

    setSubmitting(true);
    try {
      if (isEdit) {
        await updateSupplier(Number(id), request);
      } else {
        await createSupplier(request);
      }
      navigate('/suppliers');
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
          {isEdit ? 'עריכת ספק' : 'ספק חדש'}
          <span className="dot" />
        </h1>
      </div>

      {pageError && <p className={styles.pageError}>{pageError}</p>}

      <div className={styles.formCard}>
        {/* noValidate: our own Hebrew validation messages, same convention
            as EmployeeForm.tsx / Login.tsx. */}
        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.formGrid}>
            <label className={styles.field}>
              שם *
              <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} />
              {fieldErrors.name && <span className={styles.fieldError}>{fieldErrors.name}</span>}
            </label>

            <label className={styles.field}>
              קוד ספק
              <input
                type="text"
                value={form.supplierCode}
                onChange={(e) => set('supplierCode', e.target.value)}
              />
              {fieldErrors.supplierCode && (
                <span className={styles.fieldError}>{fieldErrors.supplierCode}</span>
              )}
            </label>

            <label className={styles.field}>
              קטגוריה
              <select
                value={form.categoryId}
                onChange={(e) => {
                  // Changing (or clearing) the category invalidates whichever
                  // subcategory was picked under the old one.
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
              סוג ספק
              <input
                type="text"
                value={form.supplierType}
                onChange={(e) => set('supplierType', e.target.value)}
                placeholder="לדוגמה: קבלן, ספק שירות"
              />
              {fieldErrors.supplierType && (
                <span className={styles.fieldError}>{fieldErrors.supplierType}</span>
              )}
            </label>

            <label className={styles.field}>
              אופי הוצאה
              <select
                value={form.expenseNatureId}
                onChange={(e) => set('expenseNatureId', e.target.value)}
              >
                <option value="">ללא</option>
                {expenseNatures.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name}
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

            <label className={`${styles.field} ${styles.checkboxField}`}>
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => set('active', e.target.checked)}
              />
              ספק פעיל
            </label>

            <label className={`${styles.field} ${styles.fieldFull}`}>
              הערות
              <textarea rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
              {fieldErrors.notes && <span className={styles.fieldError}>{fieldErrors.notes}</span>}
            </label>
          </div>

          <div className={styles.formActions}>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'שומר…' : isEdit ? 'שמירת שינויים' : 'יצירת ספק'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => navigate('/suppliers')}>
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
