import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  deleteExpenseTransaction,
  listExpenseTransactions,
  type ExpenseTransaction,
  type ExpenseTransactionListFilters,
} from '../../api/expenseTransactions';
import { listCategories, type Category } from '../../api/categories';
import { listSuppliers, type Supplier } from '../../api/suppliers';
import { listPaymentMethods, listPaymentStatuses, listProfitCenters, listVatTypes } from '../../api/lookups';
import type { SimpleLookup, VatTypeLookup } from '../../api/lookups';
import { translateApiError } from '../../api/errorMessages';
import { DataTable, type Column } from '../../components/DataTable';
import { DateField } from '../../components/DateField';
import styles from '../../styles/domainScreen.module.css';

function formatCurrency(amount: number | null): string {
  if (amount == null) return '—';
  return `₪${amount.toLocaleString('he-IL')}`;
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('he-IL');
}

export default function ExpenseTransactionsList() {
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState<ExpenseTransaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [profitCenters, setProfitCenters] = useState<SimpleLookup[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<SimpleLookup[]>([]);
  const [paymentStatuses, setPaymentStatuses] = useState<SimpleLookup[]>([]);
  const [vatTypes, setVatTypes] = useState<VatTypeLookup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [profitCenterFilter, setProfitCenterFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [fromFilter, setFromFilter] = useState('');
  const [toFilter, setToFilter] = useState('');
  const [includeDeleted, setIncludeDeleted] = useState(false);

  useEffect(() => {
    Promise.all([
      listCategories({ type: 'EXPENSE' }),
      listSuppliers(),
      listProfitCenters(),
      listPaymentMethods(),
      listPaymentStatuses(),
      listVatTypes(),
    ])
      .then(([cats, sups, centers, methods, statuses, types]) => {
        setCategories(cats);
        setSuppliers(sups);
        setProfitCenters(centers);
        setPaymentMethods(methods);
        setPaymentStatuses(statuses);
        setVatTypes(types);
      })
      .catch((err) => setError(translateApiError(err)));
  }, []);

  const loadTransactions = useCallback(() => {
    setLoading(true);
    setError(null);
    const filters: ExpenseTransactionListFilters = { includeDeleted };
    if (profitCenterFilter) filters.profitCenterId = Number(profitCenterFilter);
    if (supplierFilter) filters.supplierId = Number(supplierFilter);
    if (fromFilter) filters.from = fromFilter;
    if (toFilter) filters.to = toFilter;
    listExpenseTransactions(filters)
      .then(setTransactions)
      .catch((err) => setError(translateApiError(err)))
      .finally(() => setLoading(false));
  }, [profitCenterFilter, supplierFilter, fromFilter, toFilter, includeDeleted]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const categoryName = useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, c.name]));
    return (id: number | null) => (id != null ? (map.get(id) ?? '—') : null);
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

  const paymentStatusName = useMemo(() => {
    const map = new Map(paymentStatuses.map((s) => [s.id, s.name]));
    return (id: number) => map.get(id) ?? '—';
  }, [paymentStatuses]);

  const vatTypeLabel = useMemo(() => {
    const map = new Map(vatTypes.map((v) => [v.id, v.label]));
    return (id: number) => map.get(id) ?? '—';
  }, [vatTypes]);

  function categoryLabel(t: ExpenseTransaction): string {
    const cat = categoryName(t.categoryId);
    if (!cat) return '—';
    const sub = categoryName(t.subcategoryId);
    return sub ? `${cat} / ${sub}` : cat;
  }

  async function handleDelete(t: ExpenseTransaction) {
    // Irreversible via the API (see ExpenseTransactionService javadoc) — the
    // confirm wording is deliberately stronger than Employee/Supplier's
    // reversible "deactivate".
    if (!window.confirm('למחוק את ההוצאה? פעולה זו אינה ניתנת לביטול.')) return;
    setBusyId(t.id);
    setError(null);
    try {
      await deleteExpenseTransaction(t.id);
      loadTransactions();
    } catch (err) {
      setError(translateApiError(err));
    } finally {
      setBusyId(null);
    }
  }

  const columns: Column<ExpenseTransaction>[] = [
    { header: 'תאריך', render: (t) => formatDate(t.expenseDate), width: '100px' },
    { header: 'מספר הוצאה', render: (t) => t.expenseNumber ?? '—' },
    { header: 'ספק', render: (t) => supplierName(t.supplierId) },
    { header: 'מרכז רווח', render: (t) => profitCenterName(t.profitCenterId) },
    { header: 'קטגוריה', render: categoryLabel },
    { header: 'ברוטו', render: (t) => formatCurrency(t.grossAmount), align: 'end' },
    { header: 'נטו', render: (t) => formatCurrency(t.netAmount), align: 'end' },
    { header: 'מע"מ', render: (t) => formatCurrency(t.vatAmount), align: 'end' },
    { header: 'סוג מע"מ', render: (t) => vatTypeLabel(t.vatTypeId) },
    { header: 'מע"מ ניתן לניכוי', render: (t) => formatCurrency(t.deductibleVat), align: 'end' },
    { header: 'עלות אמיתית', render: (t) => formatCurrency(t.trueBusinessCost), align: 'end' },
    { header: 'אמצעי תשלום', render: (t) => paymentMethodName(t.paymentMethodId) },
    { header: 'סטטוס תשלום', render: (t) => paymentStatusName(t.paymentStatusId) },
    {
      header: '',
      render: (t) =>
        t.deletedAt ? (
          <span className={`${styles.badge} ${styles.badgeInactive}`}>נמחקה</span>
        ) : (
          <div className={styles.actionCell} onClick={(evt) => evt.stopPropagation()}>
            <button
              type="button"
              className="btn btn-danger"
              disabled={busyId === t.id}
              onClick={() => handleDelete(t)}
            >
              מחיקה
            </button>
          </div>
        ),
      align: 'end',
    },
  ];

  return (
    <div>
      <div className={styles.header}>
        <h1>
          הוצאות<span className="dot" />
        </h1>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/expenses/new')}>
          הוצאה חדשה
        </button>
      </div>

      {error && <p className={styles.pageError}>{error}</p>}

      <div className={styles.filters}>
        <select value={profitCenterFilter} onChange={(e) => setProfitCenterFilter(e.target.value)}>
          <option value="">כל מרכזי הרווח</option>
          {profitCenters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)}>
          <option value="">כל הספקים</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <DateField label="מתאריך" value={fromFilter} onChange={setFromFilter} />
        <DateField label="עד תאריך" value={toFilter} onChange={setToFilter} />
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={includeDeleted}
            onChange={(e) => setIncludeDeleted(e.target.checked)}
          />
          הצג גם מחוקות
        </label>
      </div>

      <DataTable
        columns={columns}
        rows={transactions}
        rowKey={(t) => t.id}
        onRowClick={(t) => navigate(`/expenses/${t.id}`)}
        loading={loading}
        emptyMessage="לא נמצאו הוצאות"
      />
    </div>
  );
}
