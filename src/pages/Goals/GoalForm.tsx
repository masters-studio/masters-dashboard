import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createGoal, getGoal, updateGoal, type GoalRequest } from '../../api/goals';
import { listProfitCenters, type SimpleLookup } from '../../api/lookups';
import { translateApiError } from '../../api/errorMessages';
import styles from '../../styles/domainScreen.module.css';
import { GOAL_TYPE_SUGGESTIONS } from './goalConstants';
import { HEBREW_MONTHS } from '../../constants/hebrewMonths';

interface FormState {
  month: string;
  year: string;
  profitCenterId: string;
  goalType: string;
  targetAmount: string;
}

const now = new Date();
const EMPTY_FORM: FormState = {
  month: String(now.getMonth() + 1),
  year: String(now.getFullYear()),
  profitCenterId: '',
  goalType: '',
  targetAmount: '',
};

/**
 * Shared create/edit form — mirrors GoalRequest.java's shape exactly.
 * profitCenterId left empty means a business-wide goal (null on the
 * backend), not "no goal" — a deliberate choice per GoalRequest's javadoc.
 * goalType is a free-text input with the four conventional values (see
 * goalConstants.ts) offered via <datalist> rather than a locked-down
 * <select>, matching the backend's own "convention, not a constraint" note.
 */
export default function GoalForm() {
  const { id } = useParams();
  const isEdit = id != null;
  const navigate = useNavigate();

  const [profitCenters, setProfitCenters] = useState<SimpleLookup[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [pageError, setPageError] = useState<string | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listProfitCenters()
      .then(setProfitCenters)
      .catch((err) => setPageError(translateApiError(err)));
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    getGoal(Number(id))
      .then((goal) => {
        setForm({
          month: String(goal.month),
          year: String(goal.year),
          profitCenterId: goal.profitCenterId != null ? String(goal.profitCenterId) : '',
          goalType: goal.goalType,
          targetAmount: String(goal.targetAmount),
        });
      })
      .catch((err) => setPageError(translateApiError(err)))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validate(): Partial<Record<keyof FormState, string>> {
    const errors: Partial<Record<keyof FormState, string>> = {};

    const month = Number(form.month);
    if (!form.month || Number.isNaN(month) || month < 1 || month > 12) {
      errors.month = 'יש לבחור חודש תקין';
    }

    const year = Number(form.year);
    if (!form.year || Number.isNaN(year) || year < 2000 || year > 2100) {
      errors.year = 'יש להזין שנה תקינה (2000–2100)';
    }

    if (!form.goalType.trim()) errors.goalType = 'סוג יעד הוא שדה חובה';
    else if (form.goalType.length > 50) errors.goalType = 'ארוך מדי (עד 50 תווים)';

    const target = Number(form.targetAmount);
    if (!form.targetAmount || Number.isNaN(target) || target <= 0) {
      errors.targetAmount = 'יש להזין סכום יעד תקין גדול מ-0';
    }

    return errors;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPageError(null);
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const request: GoalRequest = {
      month: Number(form.month),
      year: Number(form.year),
      profitCenterId: form.profitCenterId ? Number(form.profitCenterId) : null,
      goalType: form.goalType.trim(),
      targetAmount: Number(form.targetAmount),
    };

    setSubmitting(true);
    try {
      if (isEdit) {
        await updateGoal(Number(id), request);
      } else {
        await createGoal(request);
      }
      navigate('/goals');
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
          {isEdit ? 'עריכת יעד' : 'יעד חדש'}
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
              חודש *
              <select value={form.month} onChange={(e) => set('month', e.target.value)}>
                {HEBREW_MONTHS.map((name, i) => (
                  <option key={i} value={i + 1}>
                    {name}
                  </option>
                ))}
              </select>
              {fieldErrors.month && <span className={styles.fieldError}>{fieldErrors.month}</span>}
            </label>

            <label className={styles.field}>
              שנה *
              <input
                type="number"
                min="2000"
                max="2100"
                step="1"
                value={form.year}
                onChange={(e) => set('year', e.target.value)}
              />
              {fieldErrors.year && <span className={styles.fieldError}>{fieldErrors.year}</span>}
            </label>

            <label className={styles.field}>
              מרכז רווח
              <select
                value={form.profitCenterId}
                onChange={(e) => set('profitCenterId', e.target.value)}
              >
                <option value="">כלל העסק</option>
                {profitCenters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <span className={styles.hint}>ללא בחירה = יעד כללי לכל העסק</span>
            </label>

            <label className={styles.field}>
              סוג יעד *
              <input
                type="text"
                list="goal-type-suggestions"
                value={form.goalType}
                onChange={(e) => set('goalType', e.target.value)}
              />
              <datalist id="goal-type-suggestions">
                {GOAL_TYPE_SUGGESTIONS.map((type) => (
                  <option key={type} value={type} />
                ))}
              </datalist>
              {fieldErrors.goalType && <span className={styles.fieldError}>{fieldErrors.goalType}</span>}
            </label>

            <label className={styles.field}>
              סכום יעד (₪) *
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.targetAmount}
                onChange={(e) => set('targetAmount', e.target.value)}
              />
              {fieldErrors.targetAmount && (
                <span className={styles.fieldError}>{fieldErrors.targetAmount}</span>
              )}
            </label>
          </div>

          <div className={styles.formActions}>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'שומר…' : isEdit ? 'שמירת שינויים' : 'יצירת יעד'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => navigate('/goals')}>
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
