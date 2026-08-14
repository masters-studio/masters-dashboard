import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  activateRecurringExpense,
  deactivateRecurringExpense,
  deleteRecurringExpensePermanently,
  listRecurringExpenses,
  type RecurringExpense,
} from '../../api/recurringExpenses';
import { listCategories, type Category } from '../../api/categories';
import { listSuppliers, type Supplier } from '../../api/suppliers';
import { listProfitCenters, listPaymentMethods, listVatTypes } from '../../api/lookups';
import type { SimpleLookup, VatTypeLookup } from '../../api/lookups';
import { translateApiError } from '../../api/errorMessages';
import { DataTable, type Column } from '../../components/DataTable';
import styles from '../../styles/domainScreen.module.css';

function formatCurrency(amount: number): string {
  return `₪${amount.toLocaleString('he-IL')}`;
}

/**
 * Management screen for recurring/fixed expenses (phone, internet, rent,
 * ...) — the templates RecurringExpenseScheduler (masters-api) turns into
 * real expense transactions the moment each one's dayOfMonth arrives. Same
 * list conventions as EmployeesList/SuppliersList: includeInactive toggle,
 * activate/deactivate/permanent-delete buttons.
 */
export default function RecurringExpensesList() {
  const navigate = useNavigate();

  const [items, setItems] = useState<RecurringExpense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [profitCenters, setProfitCenters] = useState<SimpleLookup[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<SimpleLookup[]>([]);
  const [vatTypes, setVatTypes] = useState<VatTypeLookup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [includeInactive, setIncludeInactive] = useState(false);

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
      .catch((err) => setError(translateApiError(err)));
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    listRecurringExpenses(includeInactive)
      .then(setItems)
      .catch((err) => setError(translateApiError(err)))
      .finally(() => setLoading(false));
  }, [includeInactive]);

  useEffect(() => {
    load();
  }, [load]);

  const categoryName = useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, c.name]));
    return (id: number | null) => (id != null ? (map.get(id) ?? '—') : '—');
  }, [categories]);

  const supplierName = useMemo(() => {
    const map = new Map(suppliers.map((s) => [s.id, s.name]));
    return (id: number | null) => (id != null ? (map.get(id) ?? '—') : '—');
  }, [suppliers]);

  const profitCenterName = useMemo(() => {
    const map = new Map(profitCenters.map((c) => [c.id, c.name]));
    return (id: number) => map.get(id) ?? '—';
  }, [profitCenters]);

  const paymentMethodName = useMemo(() => {
    const map = new Map(paymentMethods.map((m) => [m.id, m.name]));
    return (id: number | null) => (id != null ? (map.get(id) ?? '—') : '—');
  }, [paymentMethods]);

  const vatTypeLabel = useMemo(() => {
    const map = new Map(vatTypes.map((v) => [v.id, v.label]));
    return (id: number) => map.get(id) ?? '—';
  }, [vatTypes]);

  async function handleDeactivate(item: RecurringExpense) {
    if (!window.confirm(`להשהות את "${item.name}"? הפקת עסקאות תופסק עד שתפעילו מחדש.`)) return;
    setBusyId(item.id);
    setError(null);
    try {
      await deactivateRecurringExpense(item.id);
      load();
    } catch (err) {
      setError(translateApiError(err));
    } finally {
      setBusyId(null);
    }
  }

  async function handleActivate(item: RecurringExpense) {
    setBusyId(item.id);
    setError(null);
    try {
      await activateRecurringExpense(item.id);
      load();
    } catch (err) {
      setError(translateApiError(err));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeletePermanently(item: RecurringExpense) {
    if (!window.confirm(`למחוק את "${item.name}" לצמיתות? פעולה זו אינה הפיכה.`)) return;
    setBusyId(item.id);
    setError(null);
    try {
      await deleteRecurringExpensePermanently(item.id);
      load();
    } catch (err) {
      setError(translateApiError(err));
    } finally {
      setBusyId(null);
    }
  }

  const columns: Column<RecurringExpense>[] = [
    { header: 'שם', render: (r) => r.name },
    { header: 'סכום', render: (r) => formatCurrency(r.amount), align: 'end' },
    { header: 'יום בחודש', render: (r) => r.dayOfMonth, align: 'end' },
    { header: 'מרכז רווח', render: (r) => profitCenterName(r.profitCenterId) },
    { header: 'קטגוריה', render: (r) => categoryName(r.categoryId) },
    { header: 'ספק', render: (r) => supplierName(r.supplierId) },
    { header: 'אמצעי תשלום', render: (r) => paymentMethodName(r.paymentMethodId) },
    { header: 'סוג מע"מ', render: (r) => vatTypeLabel(r.vatTypeId) },
    {
      header: 'סטטוס',
      render: (r) => (
        <span className={`${styles.badge} ${r.active ? styles.badgeActive : styles.badgeInactive}`}>
          {r.active ? 'פעיל' : 'מושהה'}
        </span>
      ),
    },
    {
      header: '',
      render: (r) => (
        <div className={styles.actionCell} onClick={(evt) => evt.stopPropagation()}>
          {r.active ? (
            <button
              type="button"
              className="btn btn-danger"
              disabled={busyId === r.id}
              onClick={() => handleDeactivate(r)}
            >
              השהיה
            </button>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={busyId === r.id}
                onClick={() => handleActivate(r)}
              >
                הפעלה
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={busyId === r.id}
                onClick={() => handleDeletePermanently(r)}
              >
                מחיקה לצמיתות
              </button>
            </>
          )}
        </div>
      ),
      align: 'end',
    },
  ];

  return (
    <div>
      <div className={styles.header}>
        <h1>
          הוצאות קבועות<span className="dot" />
        </h1>
        <div className={styles.headerActions}>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/recurring-expenses/new')}>
            הוצאה קבועה חדשה
          </button>
        </div>
      </div>

      <p className={styles.hint}>
        כל הוצאה כאן מופקת אוטומטית כעסקת הוצאה אמיתית בכל חודש, ביום שנקבע לה — אין צורך
        להזין אותה שוב ידנית.
      </p>

      {error && <p className={styles.pageError}>{error}</p>}

      <div className={styles.filters}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
          />
          הצג גם מושהות
        </label>
      </div>

      <DataTable
        columns={columns}
        rows={items}
        rowKey={(r) => r.id}
        onRowClick={(r) => navigate(`/recurring-expenses/${r.id}`)}
        loading={loading}
        emptyMessage="לא נמצאו הוצאות קבועות"
      />
    </div>
  );
}
