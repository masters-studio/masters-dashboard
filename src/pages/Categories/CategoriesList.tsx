import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  deactivateCategory,
  listCategories,
  topLevelOf,
  childrenOf,
  type Category,
  type CategoryType,
} from '../../api/categories';
import { listProfitCenters, type SimpleLookup } from '../../api/lookups';
import { translateApiError } from '../../api/errorMessages';
import domainStyles from '../../styles/domainScreen.module.css';
import styles from './Categories.module.css';

function formatBudget(budget: number | null): string {
  if (budget == null) return '—';
  return `₪${budget.toLocaleString('he-IL')}`;
}

export default function CategoriesList() {
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [profitCenters, setProfitCenters] = useState<SimpleLookup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [typeFilter, setTypeFilter] = useState<CategoryType>('EXPENSE');
  const [profitCenterFilter, setProfitCenterFilter] = useState<string>('');
  const [includeInactive, setIncludeInactive] = useState(false);

  useEffect(() => {
    listProfitCenters()
      .then(setProfitCenters)
      .catch((err) => setError(translateApiError(err)));
  }, []);

  const loadCategories = useCallback(() => {
    setLoading(true);
    setError(null);
    listCategories({
      type: typeFilter,
      profitCenterId: profitCenterFilter ? Number(profitCenterFilter) : undefined,
      includeInactive,
    })
      .then(setCategories)
      .catch((err) => setError(translateApiError(err)))
      .finally(() => setLoading(false));
  }, [typeFilter, profitCenterFilter, includeInactive]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const profitCenterName = useMemo(() => {
    const map = new Map(profitCenters.map((c) => [c.id, c.name]));
    return (id: number) => map.get(id) ?? '—';
  }, [profitCenters]);

  const topLevel = useMemo(() => topLevelOf(categories), [categories]);
  // Multiple profit centres can share this screen when the filter is "all" —
  // show which one each top-level category belongs to so same-named
  // categories under different profit centres aren't ambiguous.
  const showProfitCenterHint = !profitCenterFilter;

  async function handleDeactivate(category: Category) {
    if (!window.confirm(`להשבית את ${category.name}?`)) return;
    setBusyId(category.id);
    setError(null);
    try {
      await deactivateCategory(category.id);
      loadCategories();
    } catch (err) {
      setError(translateApiError(err));
    } finally {
      setBusyId(null);
    }
  }

  function renderRow(category: Category, isChild: boolean) {
    return (
      <div key={category.id} className={`${styles.row} ${isChild ? styles.rowChild : ''}`}>
        <div className={`${styles.name} ${isChild ? styles.nameChild : ''}`}>
          {category.name}
          {!isChild && showProfitCenterHint && (
            <span className={domainStyles.hint}>{profitCenterName(category.profitCenterId)}</span>
          )}
        </div>
        <div className={styles.budget}>{formatBudget(category.budget)}</div>
        <div className={styles.employeeRequired}>{category.employeeRequired ? 'דורש שיוך עובד' : ''}</div>
        <div className={styles.status}>
          <span
            className={`${domainStyles.badge} ${
              category.active ? domainStyles.badgeActive : domainStyles.badgeInactive
            }`}
          >
            {category.active ? 'פעיל' : 'לא פעיל'}
          </span>
        </div>
        <div className={domainStyles.actionCell}>
          {!isChild && category.active && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => navigate(`/categories/new?parentId=${category.id}`)}
            >
              תת-קטגוריה +
            </button>
          )}
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate(`/categories/${category.id}`)}
          >
            עריכה
          </button>
          {category.active && (
            <button
              type="button"
              className="btn btn-danger"
              disabled={busyId === category.id}
              onClick={() => handleDeactivate(category)}
            >
              השבתה
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className={domainStyles.header}>
        <h1>
          קטגוריות<span className="dot" />
        </h1>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/categories/new')}>
          קטגוריה חדשה
        </button>
      </div>

      {error && <p className={domainStyles.pageError}>{error}</p>}

      <div className={domainStyles.filters}>
        <div className={styles.typeToggle}>
          <button
            type="button"
            className={`btn ${typeFilter === 'EXPENSE' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTypeFilter('EXPENSE')}
          >
            הוצאות
          </button>
          <button
            type="button"
            className={`btn ${typeFilter === 'INCOME' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTypeFilter('INCOME')}
          >
            הכנסות
          </button>
        </div>
        <select value={profitCenterFilter} onChange={(e) => setProfitCenterFilter(e.target.value)}>
          <option value="">כל מרכזי הרווח</option>
          {profitCenters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <label className={domainStyles.checkboxLabel}>
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
          />
          הצג גם לא פעילים
        </label>
      </div>

      {loading ? (
        <p className={domainStyles.hint}>טוען…</p>
      ) : topLevel.length === 0 ? (
        <div className={styles.tree}>
          <div className={styles.emptyGroup}>לא נמצאו קטגוריות</div>
        </div>
      ) : (
        <div className={styles.tree}>
          {topLevel.map((parent) => (
            <div key={parent.id}>
              {renderRow(parent, false)}
              {childrenOf(categories, parent.id).map((child) => renderRow(child, true))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
