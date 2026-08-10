import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createEmployee, getEmployee, updateEmployee, type EmployeeRequest } from '../../api/employees';
import {
  listCalculationBases,
  listCompensationModels,
  listEmployeeTypes,
  listProfitCenters,
  listSettlementTypes,
  type CalculationBasisLookup,
  type CompensationModelLookup,
  type EmployeeTypeLookup,
  type SimpleLookup,
} from '../../api/lookups';
import { translateApiError } from '../../api/errorMessages';
import EmployeeServicePricesEditor from './EmployeeServicePricesEditor';
import styles from '../../styles/domainScreen.module.css';

interface FormState {
  employeeCode: string;
  name: string;
  employeeTypeId: string;
  profitCenterId: string;
  compensationModelId: string;
  /** Whole-number percent for display (e.g. "40"); converted to the 0-1
   *  fraction the API expects (0.40) only at submit time. */
  compensationPercentage: string;
  fixedAmount: string;
  calculationBasisId: string;
  settlementTypeId: string;
  /** Day of month (1-31), FIXED_AMOUNT ("renter") only — ChairRentalIncomeScheduler
   *  bills their rent on this day every month. */
  rentalDayOfMonth: string;
  active: boolean;
  notes: string;
}

const EMPTY_FORM: FormState = {
  employeeCode: '',
  name: '',
  employeeTypeId: '',
  profitCenterId: '',
  compensationModelId: '',
  compensationPercentage: '',
  fixedAmount: '',
  calculationBasisId: '',
  settlementTypeId: '',
  rentalDayOfMonth: '',
  active: true,
  notes: '',
};

/**
 * Shared create/edit form — mirrors EmployeeRequest.java's shape exactly and
 * replicates EmployeeService.validateCompensation()'s rule client-side:
 * PERCENTAGE needs compensationPercentage + calculationBasisId (forbids
 * fixedAmount); FIXED_SALARY/FIXED_AMOUNT need fixedAmount (forbid
 * percentage + calculationBasis); FIXED_AMOUNT additionally needs
 * rentalDayOfMonth (a "renter" who pays chair rent, auto-billed by
 * ChairRentalIncomeScheduler on that day every month) — forbidden for every
 * other model, including FIXED_SALARY. The backend still enforces the same
 * rule — this is UX, not the source of truth.
 */
export default function EmployeeForm() {
  const { id } = useParams();
  const isEdit = id != null;
  const navigate = useNavigate();

  const [employeeTypes, setEmployeeTypes] = useState<EmployeeTypeLookup[]>([]);
  const [profitCenters, setProfitCenters] = useState<SimpleLookup[]>([]);
  const [compensationModels, setCompensationModels] = useState<CompensationModelLookup[]>([]);
  const [calculationBases, setCalculationBases] = useState<CalculationBasisLookup[]>([]);
  const [settlementTypes, setSettlementTypes] = useState<SimpleLookup[]>([]);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [pageError, setPageError] = useState<string | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      listEmployeeTypes(),
      listProfitCenters(),
      listCompensationModels(),
      listCalculationBases(),
      listSettlementTypes(),
    ])
      .then(([types, centers, models, bases, settlements]) => {
        setEmployeeTypes(types);
        setProfitCenters(centers);
        setCompensationModels(models);
        setCalculationBases(bases);
        setSettlementTypes(settlements);
      })
      .catch((err) => setPageError(translateApiError(err)));
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    getEmployee(Number(id))
      .then((employee) => {
        setForm({
          employeeCode: employee.employeeCode ?? '',
          name: employee.name,
          employeeTypeId: String(employee.employeeTypeId),
          profitCenterId: String(employee.profitCenterId),
          compensationModelId: String(employee.compensationModelId),
          compensationPercentage:
            employee.compensationPercentage != null
              ? String(Math.round(employee.compensationPercentage * 10000) / 100)
              : '',
          fixedAmount: employee.fixedAmount != null ? String(employee.fixedAmount) : '',
          calculationBasisId:
            employee.calculationBasisId != null ? String(employee.calculationBasisId) : '',
          settlementTypeId: employee.settlementTypeId != null ? String(employee.settlementTypeId) : '',
          rentalDayOfMonth:
            employee.rentalDayOfMonth != null ? String(employee.rentalDayOfMonth) : '',
          active: employee.active,
          notes: employee.notes ?? '',
        });
      })
      .catch((err) => setPageError(translateApiError(err)))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const selectedModel = useMemo(
    () => compensationModels.find((m) => String(m.id) === form.compensationModelId),
    [compensationModels, form.compensationModelId],
  );
  const isPercentageModel = selectedModel?.code === 'PERCENTAGE';
  const isFixedModel = selectedModel?.code === 'FIXED_SALARY' || selectedModel?.code === 'FIXED_AMOUNT';
  const isRentalModel = selectedModel?.code === 'FIXED_AMOUNT';
  const selectedProfitCenter = useMemo(
    () => profitCenters.find((c) => String(c.id) === form.profitCenterId),
    [profitCenters, form.profitCenterId],
  );
  // The service price list only makes sense for מספרה — services/prices are
  // barber-service specific, and don't exist as a concept for the other
  // profit centres.
  const showServicePrices = isEdit && selectedProfitCenter?.name === 'מספרה';

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validate(): Partial<Record<keyof FormState, string>> {
    const errors: Partial<Record<keyof FormState, string>> = {};

    if (!form.name.trim()) errors.name = 'שם הוא שדה חובה';
    else if (form.name.length > 100) errors.name = 'שם ארוך מדי (עד 100 תווים)';

    if (form.employeeCode.length > 20) errors.employeeCode = 'קוד ארוך מדי (עד 20 תווים)';

    if (!form.employeeTypeId) errors.employeeTypeId = 'יש לבחור סוג עובד';
    if (!form.profitCenterId) errors.profitCenterId = 'יש לבחור מרכז רווח';
    if (!form.compensationModelId) errors.compensationModelId = 'יש לבחור מודל תגמול';

    if (isPercentageModel) {
      const pct = Number(form.compensationPercentage);
      if (!form.compensationPercentage || Number.isNaN(pct) || pct <= 0 || pct > 100) {
        errors.compensationPercentage = 'יש להזין אחוז תקין בין 0 ל-100';
      }
      if (!form.calculationBasisId) errors.calculationBasisId = 'יש לבחור בסיס חישוב';
    } else if (isFixedModel) {
      const amt = Number(form.fixedAmount);
      if (!form.fixedAmount || Number.isNaN(amt) || amt <= 0) {
        errors.fixedAmount = 'יש להזין סכום תקין גדול מ-0';
      }
      if (isRentalModel) {
        const day = Number(form.rentalDayOfMonth);
        if (!form.rentalDayOfMonth || !Number.isInteger(day) || day < 1 || day > 31) {
          errors.rentalDayOfMonth = 'יש להזין יום בחודש בין 1 ל-31';
        }
      }
    }

    if (form.notes.length > 500) errors.notes = 'הערות ארוכות מדי (עד 500 תווים)';

    return errors;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPageError(null);
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const request: EmployeeRequest = {
      employeeCode: form.employeeCode.trim() || null,
      name: form.name.trim(),
      employeeTypeId: Number(form.employeeTypeId),
      profitCenterId: Number(form.profitCenterId),
      compensationModelId: Number(form.compensationModelId),
      compensationPercentage: isPercentageModel ? Number(form.compensationPercentage) / 100 : null,
      fixedAmount: isFixedModel ? Number(form.fixedAmount) : null,
      calculationBasisId: isPercentageModel ? Number(form.calculationBasisId) : null,
      settlementTypeId: form.settlementTypeId ? Number(form.settlementTypeId) : null,
      rentalDayOfMonth: isRentalModel ? Number(form.rentalDayOfMonth) : null,
      active: form.active,
      notes: form.notes.trim() || null,
    };

    setSubmitting(true);
    try {
      if (isEdit) {
        await updateEmployee(Number(id), request);
      } else {
        await createEmployee(request);
      }
      navigate('/employees');
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
          {isEdit ? 'עריכת עובד' : 'עובד חדש'}
          <span className="dot" />
        </h1>
      </div>

      {pageError && <p className={styles.pageError}>{pageError}</p>}

      <div className={styles.formCard}>
        {/* noValidate: our own Hebrew validation messages replace the
            browser's native (non-localized) required-field tooltips —
            same convention as Login.tsx. */}
        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.formGrid}>
            <label className={styles.field}>
              שם *
              <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} />
              {fieldErrors.name && <span className={styles.fieldError}>{fieldErrors.name}</span>}
            </label>

            <label className={styles.field}>
              קוד עובד
              <input
                type="text"
                value={form.employeeCode}
                onChange={(e) => set('employeeCode', e.target.value)}
              />
              {fieldErrors.employeeCode ? (
                <span className={styles.fieldError}>{fieldErrors.employeeCode}</span>
              ) : (
                <span className={styles.hint}>אופציונלי – קוד לשימוש פנימי בלבד, לבחירתכם</span>
              )}
            </label>

            <label className={styles.field}>
              סוג עובד *
              <select value={form.employeeTypeId} onChange={(e) => set('employeeTypeId', e.target.value)}>
                <option value="">בחר/י…</option>
                {employeeTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              {fieldErrors.employeeTypeId && (
                <span className={styles.fieldError}>{fieldErrors.employeeTypeId}</span>
              )}
            </label>

            <label className={styles.field}>
              מרכז רווח *
              <select value={form.profitCenterId} onChange={(e) => set('profitCenterId', e.target.value)}>
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
              מודל תגמול *
              <select
                value={form.compensationModelId}
                onChange={(e) => {
                  // Switching models invalidates whichever compensation
                  // fields no longer apply — clear them instead of silently
                  // submitting a value the new model forbids.
                  set('compensationModelId', e.target.value);
                  set('compensationPercentage', '');
                  set('fixedAmount', '');
                  set('calculationBasisId', '');
                  set('rentalDayOfMonth', '');
                }}
              >
                <option value="">בחר/י…</option>
                {compensationModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              {fieldErrors.compensationModelId && (
                <span className={styles.fieldError}>{fieldErrors.compensationModelId}</span>
              )}
            </label>

            <label className={styles.field}>
              סוג התחשבנות
              <select
                value={form.settlementTypeId}
                onChange={(e) => set('settlementTypeId', e.target.value)}
              >
                <option value="">ללא</option>
                {settlementTypes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>

            {isPercentageModel && (
              <>
                <label className={styles.field}>
                  אחוז תגמול (%) *
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form.compensationPercentage}
                    onChange={(e) => set('compensationPercentage', e.target.value)}
                  />
                  {fieldErrors.compensationPercentage && (
                    <span className={styles.fieldError}>{fieldErrors.compensationPercentage}</span>
                  )}
                </label>

                <label className={styles.field}>
                  בסיס חישוב *
                  <select
                    value={form.calculationBasisId}
                    onChange={(e) => set('calculationBasisId', e.target.value)}
                  >
                    <option value="">בחר/י…</option>
                    {calculationBases.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.calculationBasisId && (
                    <span className={styles.fieldError}>{fieldErrors.calculationBasisId}</span>
                  )}
                </label>
              </>
            )}

            {isFixedModel && (
              <label className={styles.field}>
                סכום קבוע (₪) *
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.fixedAmount}
                  onChange={(e) => set('fixedAmount', e.target.value)}
                />
                {fieldErrors.fixedAmount && (
                  <span className={styles.fieldError}>{fieldErrors.fixedAmount}</span>
                )}
              </label>
            )}

            {isRentalModel && (
              <label className={styles.field}>
                יום חיוב בחודש *
                <input
                  type="number"
                  min="1"
                  max="31"
                  step="1"
                  value={form.rentalDayOfMonth}
                  onChange={(e) => set('rentalDayOfMonth', e.target.value)}
                />
                {fieldErrors.rentalDayOfMonth ? (
                  <span className={styles.fieldError}>{fieldErrors.rentalDayOfMonth}</span>
                ) : (
                  <span className={styles.hint}>
                    בכל חודש, ביום הזה, המערכת תרשום אוטומטית הכנסת שכירות כיסא עבור העובד/ת
                  </span>
                )}
              </label>
            )}

            <label className={`${styles.field} ${styles.checkboxField}`}>
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => set('active', e.target.checked)}
              />
              עובד/ת פעיל/ה
            </label>

            <label className={`${styles.field} ${styles.fieldFull}`}>
              הערות
              <textarea rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
              {fieldErrors.notes && <span className={styles.fieldError}>{fieldErrors.notes}</span>}
            </label>
          </div>

          <div className={styles.formActions}>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'שומר…' : isEdit ? 'שמירת שינויים' : 'יצירת עובד'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => navigate('/employees')}>
              ביטול
            </button>
          </div>
        </form>
      </div>

      {showServicePrices && <EmployeeServicePricesEditor employeeId={Number(id)} />}
    </div>
  );
}
