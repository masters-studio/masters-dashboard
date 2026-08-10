import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createIncomeTransaction, type IncomeTransactionRequest } from '../../api/incomeTransactions';
import { listCategories, type Category } from '../../api/categories';
import { listEmployees, type Employee } from '../../api/employees';
import { listPaymentStatuses, listProfitCenters, listServices } from '../../api/lookups';
import type { ServiceLookup, SimpleLookup } from '../../api/lookups';
import { listEmployeeServicePrices, type EmployeeServicePrice } from '../../api/employeeServicePrices';
import { translateApiError } from '../../api/errorMessages';
import { DateField } from '../../components/DateField';
import styles from '../../styles/domainScreen.module.css';
import lineStyles from './QuickIncomeEntry.module.css';

interface LineItem {
  serviceId: number;
  clientCount: string;
}

const PROFIT_CENTER_NAME = 'מספרה';
const CATEGORY_NAME = 'שירותים';
const SUBCATEGORY_NAME = 'תספורות';
const PAYMENT_STATUS_DEFAULT = 'שולם';

function formatCurrency(amount: number): string {
  return `₪${amount.toLocaleString('he-IL')}`;
}

/**
 * "הזנה מהירה" (task #99) — pick an employee (מספרה only) + one or more
 * services + client counts; the system looks up each service's price from
 * the employee's own price list (EmployeeServicePricesEditor, set on their
 * profile) and fills the gross amount instead of typing it in.
 *
 * Multiple services in one sitting produce one IncomeTransaction row per
 * service type (not one combined row) — matches the one-row-per-transaction
 * convention everywhere else in the app, and keeps per-service reporting
 * clean. Flagged in the roadmap as needing visual confirmation with the
 * owner once something exists to show.
 */
export default function QuickIncomeEntry() {
  const navigate = useNavigate();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [services, setServices] = useState<ServiceLookup[]>([]);
  const [profitCenters, setProfitCenters] = useState<SimpleLookup[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentStatuses, setPaymentStatuses] = useState<SimpleLookup[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [employeeId, setEmployeeId] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentStatusId, setPaymentStatusId] = useState('');
  const [lines, setLines] = useState<LineItem[]>([]);
  const [prices, setPrices] = useState<EmployeeServicePrice[]>([]);
  const [pricesLoading, setPricesLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      listEmployees(),
      listServices(),
      listProfitCenters(),
      listCategories({ type: 'INCOME' }),
      listPaymentStatuses(),
    ])
      .then(([emps, svcs, centers, cats, statuses]) => {
        setEmployees(emps);
        setServices(svcs);
        setProfitCenters(centers);
        setCategories(cats);
        setPaymentStatuses(statuses);
        const defaultStatus = statuses.find((s) => s.name === PAYMENT_STATUS_DEFAULT);
        if (defaultStatus) setPaymentStatusId(String(defaultStatus.id));
      })
      .catch((err) => setPageError(translateApiError(err)))
      .finally(() => setLoading(false));
  }, []);

  const masperaCenter = useMemo(
    () => profitCenters.find((c) => c.name === PROFIT_CENTER_NAME),
    [profitCenters],
  );

  const masperaEmployees = useMemo(
    () => employees.filter((e) => e.active && masperaCenter != null && e.profitCenterId === masperaCenter.id),
    [employees, masperaCenter],
  );

  useEffect(() => {
    if (!employeeId) {
      setPrices([]);
      setLines([]);
      return;
    }
    setPricesLoading(true);
    listEmployeeServicePrices(Number(employeeId))
      .then(setPrices)
      .catch((err) => setPageError(translateApiError(err)))
      .finally(() => setPricesLoading(false));
    setLines([]);
  }, [employeeId]);

  const priceByServiceId = useMemo(() => new Map(prices.map((p) => [p.serviceId, p.price])), [prices]);
  const availableServices = useMemo(
    () => services.filter((s) => !lines.some((l) => l.serviceId === s.id)),
    [services, lines],
  );

  function addLine() {
    const next = availableServices[0];
    if (!next) return;
    setLines((ls) => [...ls, { serviceId: next.id, clientCount: '1' }]);
  }

  function removeLine(index: number) {
    setLines((ls) => ls.filter((_, i) => i !== index));
  }

  function updateLine(index: number, patch: Partial<LineItem>) {
    setLines((ls) => ls.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function lineGross(line: LineItem): number {
    const price = priceByServiceId.get(line.serviceId) ?? 0;
    const count = Number(line.clientCount) || 0;
    return price * count;
  }

  const totalGross = lines.reduce((sum, l) => sum + lineGross(l), 0);

  const category = useMemo(() => categories.find((c) => c.name === CATEGORY_NAME), [categories]);
  const subcategory = useMemo(() => categories.find((c) => c.name === SUBCATEGORY_NAME), [categories]);

  function validate(): string | null {
    if (!employeeId) return 'יש לבחור עובד/ת';
    if (!transactionDate) return 'יש לבחור תאריך';
    if (!paymentStatusId) return 'יש לבחור סטטוס תשלום';
    if (lines.length === 0) return 'יש להוסיף לפחות שירות אחד';
    for (const line of lines) {
      const count = Number(line.clientCount);
      if (!line.clientCount || !Number.isInteger(count) || count <= 0) {
        return 'מספר לקוחות חייב להיות מספר שלם גדול מ-0 בכל שורה';
      }
      if (!priceByServiceId.has(line.serviceId)) {
        const svcName = services.find((s) => s.id === line.serviceId)?.name ?? '';
        return `לא הוגדר מחיר עבור "${svcName}" לעובד/ת זו — יש להגדיר מחירון בעמוד העובד/ת`;
      }
    }
    if (!masperaCenter) return 'לא נמצא מרכז רווח "מספרה"';
    if (!category || !subcategory) return 'לא נמצאה קטגוריית "שירותים / תספורות"';
    return null;
  }

  async function handleSubmit() {
    setPageError(null);
    const validationError = validate();
    if (validationError) {
      setPageError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      for (const line of lines) {
        const service = services.find((s) => s.id === line.serviceId);
        const request: IncomeTransactionRequest = {
          transactionNumber: null,
          transactionDate,
          employeeId: Number(employeeId),
          profitCenterId: masperaCenter!.id,
          categoryId: category!.id,
          subcategoryId: subcategory!.id,
          grossAmount: lineGross(line),
          vatRate: null,
          paymentMethodId: null,
          paymentStatusId: Number(paymentStatusId),
          referenceNumber: null,
          notes: `${service?.name ?? ''} × ${line.clientCount}`,
        };
        await createIncomeTransaction(request);
      }
      navigate('/income');
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
          הזנה מהירה<span className="dot" />
        </h1>
      </div>

      {pageError && <p className={styles.pageError}>{pageError}</p>}

      <div className={styles.formCard}>
        <div className={styles.formGrid}>
          <label className={styles.field}>
            עובד/ת *
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              <option value="">בחר/י…</option>
              {masperaEmployees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
            {masperaEmployees.length === 0 && (
              <span className={styles.hint}>אין עובדים פעילים במרכז הרווח "מספרה"</span>
            )}
          </label>

          <div className={styles.field}>
            <DateField label="תאריך *" value={transactionDate} onChange={setTransactionDate} />
          </div>

          <label className={styles.field}>
            סטטוס תשלום *
            <select value={paymentStatusId} onChange={(e) => setPaymentStatusId(e.target.value)}>
              <option value="">בחר/י…</option>
              {paymentStatuses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {employeeId && (
          <div className={lineStyles.lines}>
            <div className={lineStyles.linesHeader}>
              <span>שירותים</span>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={addLine}
                disabled={pricesLoading || availableServices.length === 0}
              >
                + הוספת שירות
              </button>
            </div>

            {pricesLoading ? (
              <p className={styles.hint}>טוען מחירון…</p>
            ) : prices.length === 0 ? (
              <p className={styles.hint}>
                לא הוגדר מחירון לעובד/ת זו — יש להגדיר מחירים בעמוד העובד/ת לפני הזנה מהירה.
              </p>
            ) : lines.length === 0 ? (
              <p className={styles.hint}>לחצו על "הוספת שירות" כדי להתחיל.</p>
            ) : (
              lines.map((line, i) => {
                const price = priceByServiceId.get(line.serviceId);
                return (
                  <div key={i} className={lineStyles.lineRow}>
                    <select
                      value={line.serviceId}
                      onChange={(e) => updateLine(i, { serviceId: Number(e.target.value) })}
                    >
                      {services
                        .filter((s) => s.id === line.serviceId || !lines.some((l) => l.serviceId === s.id))
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={line.clientCount}
                      onChange={(e) => updateLine(i, { clientCount: e.target.value })}
                      className={lineStyles.countInput}
                    />
                    <span className={lineStyles.lineNote}>
                      {price != null ? `${formatCurrency(price)} × ${line.clientCount || 0} = ` : 'אין מחיר'}
                      {price != null && <strong>{formatCurrency(lineGross(line))}</strong>}
                    </span>
                    <button type="button" className="btn btn-ghost" onClick={() => removeLine(i)}>
                      הסרה
                    </button>
                  </div>
                );
              })
            )}

            {lines.length > 0 && (
              <div className={lineStyles.total}>סה״כ: {formatCurrency(totalGross)}</div>
            )}
          </div>
        )}

        <div className={styles.formActions}>
          <button type="button" className="btn btn-primary" disabled={submitting} onClick={handleSubmit}>
            {submitting ? 'שומר…' : 'שמירת עסקאות'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/income')}>
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
