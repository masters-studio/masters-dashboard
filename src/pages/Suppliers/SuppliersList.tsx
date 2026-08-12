import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  deactivateSupplier,
  listSuppliers,
  type Supplier,
  type SupplierListFilters,
} from '../../api/suppliers';
import { listCategories, topLevelOf, type Category } from '../../api/categories';
import { listExpenseNatures, listPaymentMethods, listPaymentTerms } from '../../api/lookups';
import type { SimpleLookup } from '../../api/lookups';
import { translateApiError } from '../../api/errorMessages';
import { exportSuppliers } from '../../api/export';
import { DataTable, type Column } from '../../components/DataTable';
import { ExportButton } from '../../components/ExportButton';
import styles from '../../styles/domainScreen.module.css';

export default function SuppliersList() {
  const navigate = useNavigate();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<SimpleLookup[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<SimpleLookup[]>([]);
  const [expenseNatures, setExpenseNatures] = useState<SimpleLookup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [expenseNatureFilter, setExpenseNatureFilter] = useState<string>('');
  const [includeInactive, setIncludeInactive] = useState(false);

  // Lookups + the (EXPENSE-only) category tree rarely change within a
  // session — fetch once, independent of filters. Suppliers are only ever
  // filed under EXPENSE categories (SupplierService.requireExpenseType), so
  // there's no need to fetch INCOME categories here at all.
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
      .catch((err) => setError(translateApiError(err)));
  }, []);

  const loadSuppliers = useCallback(() => {
    setLoading(true);
    setError(null);
    const filters: SupplierListFilters = { includeInactive };
    if (categoryFilter) filters.categoryId = Number(categoryFilter);
    if (expenseNatureFilter) filters.expenseNatureId = Number(expenseNatureFilter);
    listSuppliers(filters)
      .then(setSuppliers)
      .catch((err) => setError(translateApiError(err)))
      .finally(() => setLoading(false));
  }, [categoryFilter, expenseNatureFilter, includeInactive]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const categoryName = useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, c.name]));
    return (id: number | null) => (id != null ? (map.get(id) ?? '—') : '—');
  }, [categories]);

  const paymentTermName = useMemo(() => {
    const map = new Map(paymentTerms.map((t) => [t.id, t.name]));
    return (id: number | null) => (id != null ? (map.get(id) ?? '—') : '—');
  }, [paymentTerms]);

  const paymentMethodName = useMemo(() => {
    const map = new Map(paymentMethods.map((m) => [m.id, m.name]));
    return (id: number | null) => (id != null ? (map.get(id) ?? '—') : '—');
  }, [paymentMethods]);

  const topLevelCategories = useMemo(() => topLevelOf(categories), [categories]);

  async function handleDeactivate(supplier: Supplier) {
    if (!window.confirm(`להשבית את ${supplier.name}?`)) return;
    setBusyId(supplier.id);
    setError(null);
    try {
      await deactivateSupplier(supplier.id);
      loadSuppliers();
    } catch (err) {
      setError(translateApiError(err));
    } finally {
      setBusyId(null);
    }
  }

  const columns: Column<Supplier>[] = [
    { header: 'קוד', render: (s) => s.supplierCode ?? '—', width: '90px' },
    { header: 'שם', render: (s) => s.name },
    { header: 'קטגוריה', render: (s) => categoryName(s.categoryId) },
    { header: 'תת-קטגוריה', render: (s) => categoryName(s.subcategoryId) },
    { header: 'סוג ספק', render: (s) => s.supplierType ?? '—' },
    { header: 'תנאי תשלום', render: (s) => paymentTermName(s.paymentTermsId) },
    { header: 'אמצעי תשלום', render: (s) => paymentMethodName(s.paymentMethodId) },
    {
      header: 'סטטוס',
      render: (s) => (
        <span className={`${styles.badge} ${s.active ? styles.badgeActive : styles.badgeInactive}`}>
          {s.active ? 'פעיל' : 'לא פעיל'}
        </span>
      ),
    },
    {
      header: '',
      render: (s) => (
        <div className={styles.actionCell} onClick={(evt) => evt.stopPropagation()}>
          {s.active && (
            <button
              type="button"
              className="btn btn-danger"
              disabled={busyId === s.id}
              onClick={() => handleDeactivate(s)}
            >
              השבתה
            </button>
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
          ספקים<span className="dot" />
        </h1>
        <div className={styles.headerActions}>
          <ExportButton onExport={() => exportSuppliers(includeInactive)} />
          <button type="button" className="btn btn-primary" onClick={() => navigate('/suppliers/new')}>
            ספק חדש
          </button>
        </div>
      </div>

      {error && <p className={styles.pageError}>{error}</p>}

      <div className={styles.filters}>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">כל הקטגוריות</option>
          {topLevelCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={expenseNatureFilter} onChange={(e) => setExpenseNatureFilter(e.target.value)}>
          <option value="">כל אופי ההוצאה</option>
          {expenseNatures.map((n) => (
            <option key={n.id} value={n.id}>
              {n.name}
            </option>
          ))}
        </select>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
          />
          הצג גם לא פעילים
        </label>
      </div>

      <DataTable
        columns={columns}
        rows={suppliers}
        rowKey={(s) => s.id}
        onRowClick={(s) => navigate(`/suppliers/${s.id}`)}
        loading={loading}
        emptyMessage="לא נמצאו ספקים"
      />
    </div>
  );
}
