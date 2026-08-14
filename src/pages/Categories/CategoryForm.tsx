import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  createCategory,
  getCategory,
  listCategories,
  topLevelOf,
  updateCategory,
  type Category,
  type CategoryRequest,
  type CategoryType,
} from '../../api/categories';
import { listProfitCenters, type SimpleLookup } from '../../api/lookups';
import { translateApiError } from '../../api/errorMessages';
import styles from '../../styles/domainScreen.module.css';

interface FormState {
  type: CategoryType;
  profitCenterId: string;
  parentCategoryId: string;
  name: string;
  budget: string;
  employeeRequired: boolean;
  active: boolean;
}

const EMPTY_FORM: FormState = {
  type: 'EXPENSE',
  profitCenterId: '',
  parentCategoryId: '',
  name: '',
  budget: '',
  employeeRequired: false,
  active: true,
};

/**
 * Shared create/edit form — mirrors CategoryRequest.java's shape exactly and
 * replicates CategoryService.resolveParent()'s rule client-side: a parent
 * must itself be top-level, and must share both type and profitCenterId
 * with the child. The parent select is only ever populated with matching
 * top-level categories and is cleared whenever type or profit centre
 * changes, same convention as SupplierForm clearing subcategory on category
 * change.
 */
export default function CategoryForm() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const preselectedParentId = searchParams.get('parentId');
  const isEdit = id != null;
  const navigate = useNavigate();

  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [profitCenters, setProfitCenters] = useState<SimpleLookup[]>([]);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [pageError, setPageError] = useState<string | null>(null);
  const [loading, setLoading] = useState(isEdit || preselectedParentId != null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([listCategories(), listProfitCenters()])
      .then(([cats, centers]) => {
        setAllCategories(cats);
        setProfitCenters(centers);
      })
      .catch((err) => setPageError(translateApiError(err)));
  }, []);

  useEffect(() => {
    if (isEdit) {
      setLoading(true);
      getCategory(Number(id))
        .then((category) => {
          setForm({
            type: category.type,
            profitCenterId: String(category.profitCenterId),
            parentCategoryId: category.parentCategoryId != null ? String(category.parentCategoryId) : '',
            name: category.name,
            budget: category.budget != null ? String(category.budget) : '',
            employeeRequired: category.employeeRequired,
            active: category.active,
          });
        })
        .catch((err) => setPageError(translateApiError(err)))
        .finally(() => setLoading(false));
      return;
    }

    // "add subcategory" from the list screen — prefill type/profit-centre/
    // parent from the real parent row instead of trusting the query param.
    if (preselectedParentId) {
      setLoading(true);
      getCategory(Number(preselectedParentId))
        .then((parent) => {
          setForm((f) => ({
            ...f,
            type: parent.type,
            profitCenterId: String(parent.profitCenterId),
            parentCategoryId: String(parent.id),
          }));
        })
        .catch((err) => setPageError(translateApiError(err)))
        .finally(() => setLoading(false));
    }
  }, [id, isEdit, preselectedParentId]);

  const parentOptions = useMemo(() => {
    const selfId = isEdit ? Number(id) : null;
    return topLevelOf(allCategories).filter(
      (c) =>
        c.type === form.type &&
        String(c.profitCenterId) === form.profitCenterId &&
        c.id !== selfId,
    );
  }, [allCategories, form.type, form.profitCenterId, isEdit, id]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validate(): Partial<Record<keyof FormState, string>> {
    const errors: Partial<Record<keyof FormState, string>> = {};

    if (!form.name.trim()) errors.name = 'שם הוא שדה חובה';
    else if (form.name.length > 100) errors.name = 'שם ארוך מדי (עד 100 תווים)';

    if (!form.profitCenterId) errors.profitCenterId = 'יש לבחור מרכז רווח';

    if (form.budget) {
      const b = Number(form.budget);
      if (Number.isNaN(b) || b < 0) errors.budget = 'התקציב חייב להיות מספר אפס או גדול ממנו';
    }

    return errors;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPageError(null);
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const request: CategoryRequest = {
      type: form.type,
      profitCenterId: Number(form.profitCenterId),
      parentCategoryId: form.parentCategoryId ? Number(form.parentCategoryId) : null,
      name: form.name.trim(),
      budget: form.budget ? Number(form.budget) : null,
      employeeRequired: form.employeeRequired,
      active: form.active,
    };

    setSubmitting(true);
    try {
      if (isEdit) {
        await updateCategory(Number(id), request);
      } else {
        await createCategory(request);
      }
      navigate('/categories');
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
          {isEdit ? 'עריכת קטגוריה' : 'קטגוריה חדשה'}
          <span className="dot" />
        </h1>
      </div>

      {pageError && <p className={styles.pageError}>{pageError}</p>}

      <div className={styles.formCard}>
        {/* noValidate: our own Hebrew validation messages, same convention
            as every other domain form. */}
        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.formGrid}>
            <label className={styles.field}>
              סוג *
              <select
                value={form.type}
                onChange={(e) => {
                  // Changing type invalidates a parent from the other tree.
                  set('type', e.target.value as CategoryType);
                  set('parentCategoryId', '');
                }}
              >
                <option value="EXPENSE">הוצאה</option>
                <option value="INCOME">הכנסה</option>
              </select>
            </label>

            <label className={styles.field}>
              מרכז רווח *
              <select
                value={form.profitCenterId}
                onChange={(e) => {
                  // Changing profit centre invalidates a parent from the old one.
                  set('profitCenterId', e.target.value);
                  set('parentCategoryId', '');
                }}
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
              קטגוריית אב
              <select
                value={form.parentCategoryId}
                onChange={(e) => set('parentCategoryId', e.target.value)}
                disabled={!form.profitCenterId}
              >
                <option value="">קטגוריה ראשית (ללא אב)</option>
                {parentOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {!form.profitCenterId && <span className={styles.hint}>יש לבחור מרכז רווח תחילה</span>}
            </label>

            <label className={styles.field}>
              שם *
              <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} />
              {fieldErrors.name && <span className={styles.fieldError}>{fieldErrors.name}</span>}
            </label>

            <label className={styles.field}>
              תקציב (₪)
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.budget}
                onChange={(e) => set('budget', e.target.value)}
              />
              {fieldErrors.budget && <span className={styles.fieldError}>{fieldErrors.budget}</span>}
            </label>

            <label className={`${styles.field} ${styles.checkboxField}`}>
              <input
                type="checkbox"
                checked={form.employeeRequired}
                onChange={(e) => set('employeeRequired', e.target.checked)}
              />
              דורש שיוך עובד
            </label>

          </div>

          <div className={styles.formActions}>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'שומר…' : isEdit ? 'שמירת שינויים' : 'יצירת קטגוריה'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => navigate('/categories')}>
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
