import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteGoal, listGoals, type Goal, type GoalListFilters } from '../../api/goals';
import { listProfitCenters, type SimpleLookup } from '../../api/lookups';
import { translateApiError } from '../../api/errorMessages';
import { DataTable, type Column } from '../../components/DataTable';
import styles from '../../styles/domainScreen.module.css';
import { GOAL_TYPE_SUGGESTIONS } from './goalConstants';
import { HEBREW_MONTHS } from '../../constants/hebrewMonths';

function formatCurrency(amount: number): string {
  return `₪${amount.toLocaleString('he-IL')}`;
}

export default function GoalsList() {
  const navigate = useNavigate();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [profitCenters, setProfitCenters] = useState<SimpleLookup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [profitCenterFilter, setProfitCenterFilter] = useState('');
  const [goalTypeFilter, setGoalTypeFilter] = useState('');

  useEffect(() => {
    listProfitCenters()
      .then(setProfitCenters)
      .catch((err) => setError(translateApiError(err)));
  }, []);

  const loadGoals = useCallback(() => {
    setLoading(true);
    setError(null);
    const filters: GoalListFilters = {};
    if (monthFilter) filters.month = Number(monthFilter);
    if (yearFilter) filters.year = Number(yearFilter);
    if (profitCenterFilter) filters.profitCenterId = Number(profitCenterFilter);
    if (goalTypeFilter) filters.goalType = goalTypeFilter;
    listGoals(filters)
      .then(setGoals)
      .catch((err) => setError(translateApiError(err)))
      .finally(() => setLoading(false));
  }, [monthFilter, yearFilter, profitCenterFilter, goalTypeFilter]);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const profitCenterName = useMemo(() => {
    const map = new Map(profitCenters.map((c) => [c.id, c.name]));
    return (id: number | null) => (id != null ? (map.get(id) ?? '—') : 'כלל העסק');
  }, [profitCenters]);

  async function handleDelete(goal: Goal) {
    // A real DELETE (goals has no active flag or deleted_at column) --
    // stronger wording than every other domain's confirm, since this one
    // is truly, immediately permanent.
    if (!window.confirm('למחוק את היעד לצמיתות? הפעולה אינה ניתנת לביטול בשום צורה.')) return;
    setBusyId(goal.id);
    setError(null);
    try {
      await deleteGoal(goal.id);
      loadGoals();
    } catch (err) {
      setError(translateApiError(err));
    } finally {
      setBusyId(null);
    }
  }

  const columns: Column<Goal>[] = [
    { header: 'חודש', render: (g) => `${HEBREW_MONTHS[g.month - 1]} ${g.year}`, width: '140px' },
    { header: 'מרכז רווח', render: (g) => profitCenterName(g.profitCenterId) },
    { header: 'סוג יעד', render: (g) => g.goalType },
    { header: 'סכום יעד', render: (g) => formatCurrency(g.targetAmount), align: 'end' },
    {
      header: '',
      render: (g) => (
        <div className={styles.actionCell} onClick={(evt) => evt.stopPropagation()}>
          <button
            type="button"
            className="btn btn-danger"
            disabled={busyId === g.id}
            onClick={() => handleDelete(g)}
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
          יעדים<span className="dot" />
        </h1>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/goals/new')}>
          יעד חדש
        </button>
      </div>

      {error && <p className={styles.pageError}>{error}</p>}

      <div className={styles.filters}>
        <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
          <option value="">כל החודשים</option>
          {HEBREW_MONTHS.map((name, i) => (
            <option key={i} value={i + 1}>
              {name}
            </option>
          ))}
        </select>
        <input
          type="number"
          placeholder="שנה"
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          style={{ width: '90px' }}
        />
        <select value={profitCenterFilter} onChange={(e) => setProfitCenterFilter(e.target.value)}>
          <option value="">כל מרכזי הרווח</option>
          {profitCenters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={goalTypeFilter} onChange={(e) => setGoalTypeFilter(e.target.value)}>
          <option value="">כל סוגי היעדים</option>
          {GOAL_TYPE_SUGGESTIONS.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        rows={goals}
        rowKey={(g) => g.id}
        onRowClick={(g) => navigate(`/goals/${g.id}`)}
        loading={loading}
        emptyMessage="לא נמצאו יעדים"
      />
    </div>
  );
}
