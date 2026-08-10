import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  deleteIncomeTransaction,
  listIncomeTransactions,
  type IncomeTransaction,
  type IncomeTransactionListFilters,
} from '../../api/incomeTransactions';
import { listCategories, type Category } from '../../api/categories';
import { listEmployees, type Employee } from '../../api/employees';
import { listPaymentMethods, listPaymentStatuses } from '../../api/lookups';
import type { SimpleLookup } from '../../api/lookups';
import { listProfitCenters } from '../../api/lookups';
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

export default function IncomeTransactionsList() {
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState<IncomeTransaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [profitCenters, setProfitCenters] = useState<SimpleLookup[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<SimpleLookup[]>([]);
  const [paymentStatuses, setPaymentStatuses] = useState<SimpleLookup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [profitCenterFilter, setProfitCenterFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [fromFilter, setFromFilter] = useState('');
  const [toFilter, setToFilter] = useState('');
  const [includeDeleted, setIncludeDeleted] = useState(false);

  useEffect(() => {
    Promise.all([
      listCategories({ type: 'INCOME' }),
      listEmployees(),
      listProfitCenters(),
      listPaymentMethods(),
      listPaymentStatuses(),
    ])
      .then(([cats, emps, centers, methods, statuses]) => {
        setCategories(cats);
        setEmployees(emps);
        setProfitCenters(centers);
        setPaymentMethods(methods);
        setPaymentStatuses(statuses);
      })
      .catch((err) => setError(translateApiError(err)));
  }, []);

  const loadTransactions = useCallback(() => {
    setLoading(true);
    setError(null);
    const filters: IncomeTransactionListFilters = { includeDeleted };
    if (profitCenterFilter) filters.profitCenterId = Number(profitCenterFilter);
    if (employeeFilter) filters.employeeId = Number(employeeFilter);
    if (fromFilter) filters.from = fromFilter;
    if (toFilter) filters.to = toFilter;
    listIncomeTransactions(filters)
      .then(setTransactions)
      .catch((err) => setError(translateApiError(err)))
      .finally(() => setLoading(false));
  }, [profitCenterFilter, employeeFilter, fromFilter, toFilter, includeDeleted]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const categoryName = useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, c.name]));
    return (id: number | null) => (id != null ? (map.get(id) ?? '—') : null);
  }, [categories]);

  const employeeName = useMemo(() => {
    const map = new Map(employees.map((e) => [e.id, e.name]));
    return (id: number | null) => (id != null ? (map.get(id) ?? '—') : '—');
  }, [employees]);

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

  function categoryLabel(t: IncomeTransaction): string {
    const cat = categoryName(t.categoryId);
    if (!cat) return '—';
    const sub = categoryName(t.subcategoryId);
    return sub ? `${cat} / ${sub}` : cat;
  }

  async function handleDelete(t: IncomeTransaction) {
    // Irreversible via the API (see IncomeTransactionService javadoc) — the
    // confirm wording is deliberately stronger than Employee/Supplier's
    // reversible "deactivate".
    if (!window.confirm('למחוק את העסקה? פעולה זו אינה ניתנת לביטול.')) return;
    setBusyId(t.id);
    setError(null);
    try {
      await deleteIncomeTransaction(t.id);
      loadTransactions();
    } catch (err) {
      setError(translateApiError(err));
    } finally {
      setBusyId(null);
    }
  }

  const columns: Column<IncomeTransaction>[] = [
    { header: 'תאריך', render: (t) => formatDate(t.transactionDate), width: '100px' },
    { header: 'מספר עסקה', render: (t) => t.transactionNumber ?? '—' },
    { header: 'עובד', render: (t) => employeeName(t.employeeId) },
    { header: 'מרכז רווח', render: (t) => profitCenterName(t.profitCenterId) },
    { header: 'קטגוריה', render: categoryLabel },
    { header: 'ברוטו', render: (t) => formatCurrency(t.grossAmount), align: 'end' },
    { header: 'נטו', render: (t) => formatCurrency(t.netAmount), align: 'end' },
    { header: 'מע"מ', render: (t) => formatCurrency(t.vatAmount), align: 'end' },
    { header: 'חלק עובד', render: (t) => formatCurrency(t.employeeShare), align: 'end' },
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
          הכנסות<span className="dot" />
        </h1>
        <div className={styles.headerActions}>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/income/quick-entry')}>
            הזנה מהירה
          </button>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/income/new')}>
            עסקת הכנסה חדשה
          </button>
        </div>
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
        <select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)}>
          <option value="">כל העובדים</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
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
        onRowClick={(t) => navigate(`/income/${t.id}`)}
        loading={loading}
        emptyMessage="לא נמצאו עסקאות הכנסה"
      />
    </div>
  );
}
