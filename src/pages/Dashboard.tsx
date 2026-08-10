import { useEffect, useState } from 'react';
import {
  getDashboardSummary,
  getEmployeeBreakdown,
  type DashboardSummary,
  type EmployeeBreakdown,
  type EmployeeBreakdownRow,
} from '../api/dashboard';
import { listProfitCenters, type SimpleLookup } from '../api/lookups';
import { translateApiError } from '../api/errorMessages';
import { HEBREW_MONTHS } from '../constants/hebrewMonths';
import { DataTable, type Column } from '../components/DataTable';
import domainStyles from '../styles/domainScreen.module.css';
import styles from './Dashboard.module.css';

const now = new Date();

/** Negative amounts read as "-₪500", not "₪-500". */
function formatCurrency(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  return `${sign}₪${Math.abs(amount).toLocaleString('he-IL')}`;
}

function kpiValueClass(amount: number): string {
  if (amount > 0) return styles.kpiValuePositive;
  if (amount < 0) return styles.kpiValueNegative;
  return '';
}

/**
 * "אין נתון" (no data), not "₪0" — employeeShare is genuinely untracked for
 * non-PERCENTAGE employees (see EmployeeBreakdownRowDto's javadoc), and a
 * literal 0 would misleadingly read as "got paid nothing".
 */
const employeeBreakdownColumns: Column<EmployeeBreakdownRow>[] = [
  { header: 'שם', render: (r) => r.employeeName },
  { header: 'סוג', render: (r) => r.employeeTypeName },
  { header: 'הכנסה שהביא/ה (נטו)', render: (r) => formatCurrency(r.revenueGenerated), align: 'end' },
  {
    header: 'חלק העובד/ת',
    render: (r) => (r.employeeShare != null ? formatCurrency(r.employeeShare) : 'אין נתון'),
    align: 'end',
  },
  { header: 'חלק העסק', render: (r) => formatCurrency(r.businessShare), align: 'end' },
  { header: 'מס׳ עסקאות', render: (r) => r.transactionCount, align: 'end' },
];

/**
 * Monthly financial summary — GET /dashboard/summary. See DashboardService's
 * class javadoc (masters-api) for the scope decisions behind these numbers:
 * income is reported two ways (total processed vs. what the business
 * actually retains after percentage-employee cuts), there's no "gross
 * profit" field since its formula was unrecoverable in the source
 * spreadsheet, and this is accrual basis (every transaction dated within
 * the month counts regardless of payment_status), not true cash-flow.
 */
export default function Dashboard() {
  const [profitCenters, setProfitCenters] = useState<SimpleLookup[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [breakdown, setBreakdown] = useState<EmployeeBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [breakdownLoading, setBreakdownLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [profitCenterFilter, setProfitCenterFilter] = useState('');

  useEffect(() => {
    listProfitCenters()
      .then(setProfitCenters)
      .catch((err) => setError(translateApiError(err)));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getDashboardSummary({
      month,
      year,
      profitCenterId: profitCenterFilter ? Number(profitCenterFilter) : undefined,
    })
      .then(setSummary)
      .catch((err) => setError(translateApiError(err)))
      .finally(() => setLoading(false));
  }, [month, year, profitCenterFilter]);

  useEffect(() => {
    setBreakdownLoading(true);
    getEmployeeBreakdown({
      month,
      year,
      profitCenterId: profitCenterFilter ? Number(profitCenterFilter) : undefined,
    })
      .then(setBreakdown)
      .catch((err) => setError(translateApiError(err)))
      .finally(() => setBreakdownLoading(false));
  }, [month, year, profitCenterFilter]);

  const hasAnyActivity =
    summary != null && (summary.totalIncomeGross !== 0 || summary.totalExpensesGross !== 0);

  return (
    <div>
      <div className={domainStyles.header}>
        <h1>
          דשבורד<span className="dot" />
        </h1>
      </div>

      {error && <p className={domainStyles.pageError}>{error}</p>}

      <div className={styles.periodBar}>
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {HEBREW_MONTHS.map((name, i) => (
            <option key={i} value={i + 1}>
              {name}
            </option>
          ))}
        </select>
        <input
          type="number"
          min="2000"
          max="2100"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
        />
        <select value={profitCenterFilter} onChange={(e) => setProfitCenterFilter(e.target.value)}>
          <option value="">כלל העסק</option>
          {profitCenters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className={domainStyles.hint}>טוען…</p>
      ) : summary ? (
        <>
          {!hasAnyActivity && (
            <p className={styles.emptyNotice}>אין עדיין עסקאות רשומות עבור התקופה שנבחרה.</p>
          )}

          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>רווח נקי</div>
              <div className={`${styles.kpiValue} ${kpiValueClass(summary.netProfit)}`}>
                {formatCurrency(summary.netProfit)}
              </div>
              <div className={styles.kpiSub}>חלק העסק בהכנסות פחות עלות אמיתית של ההוצאות</div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>סה״כ הכנסות (נטו)</div>
              <div className={styles.kpiValue}>{formatCurrency(summary.totalIncomeNet)}</div>
              <div className={styles.kpiSub}>
                מזה לעסק: {formatCurrency(summary.businessIncomeShare)}
              </div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>סה״כ הוצאות (עלות אמיתית)</div>
              <div className={styles.kpiValue}>{formatCurrency(summary.totalExpensesTrueCost)}</div>
              <div className={styles.kpiSub}>נטו: {formatCurrency(summary.totalExpensesNet)}</div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>מאזן מע״מ</div>
              <div className={styles.kpiValue}>{formatCurrency(Math.abs(summary.vatBalance))}</div>
              <div className={styles.kpiSub}>
                {summary.vatBalance >= 0 ? 'לתשלום לרשות המסים' : 'לזיכוי מרשות המסים'}
              </div>
            </div>
          </div>

          <div className={styles.sections}>
            <div>
              <div className={styles.sectionTitle}>פירוט הכנסות</div>
              <div className={domainStyles.computedPanel}>
                <div className={domainStyles.computedItem}>
                  <span className={domainStyles.computedLabel}>ברוטו</span>
                  <span className={domainStyles.computedValue}>
                    {formatCurrency(summary.totalIncomeGross)}
                  </span>
                </div>
                <div className={domainStyles.computedItem}>
                  <span className={domainStyles.computedLabel}>נטו</span>
                  <span className={domainStyles.computedValue}>
                    {formatCurrency(summary.totalIncomeNet)}
                  </span>
                </div>
                <div className={domainStyles.computedItem}>
                  <span className={domainStyles.computedLabel}>חלק העסק</span>
                  <span className={domainStyles.computedValue}>
                    {formatCurrency(summary.businessIncomeShare)}
                  </span>
                </div>
                <div className={domainStyles.computedItem}>
                  <span className={domainStyles.computedLabel}>חלק העובדים</span>
                  <span className={domainStyles.computedValue}>
                    {formatCurrency(summary.employeeShareTotal)}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <div className={styles.sectionTitle}>פירוט הוצאות</div>
              <div className={domainStyles.computedPanel}>
                <div className={domainStyles.computedItem}>
                  <span className={domainStyles.computedLabel}>ברוטו</span>
                  <span className={domainStyles.computedValue}>
                    {formatCurrency(summary.totalExpensesGross)}
                  </span>
                </div>
                <div className={domainStyles.computedItem}>
                  <span className={domainStyles.computedLabel}>נטו</span>
                  <span className={domainStyles.computedValue}>
                    {formatCurrency(summary.totalExpensesNet)}
                  </span>
                </div>
                <div className={domainStyles.computedItem}>
                  <span className={domainStyles.computedLabel}>עלות אמיתית לעסק</span>
                  <span className={domainStyles.computedValue}>
                    {formatCurrency(summary.totalExpensesTrueCost)}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <div className={styles.sectionTitle}>פירוט מע״מ</div>
              <div className={domainStyles.computedPanel}>
                <div className={domainStyles.computedItem}>
                  <span className={domainStyles.computedLabel}>מע״מ עסקאות (הכנסות)</span>
                  <span className={domainStyles.computedValue}>
                    {formatCurrency(summary.outputVat)}
                  </span>
                </div>
                <div className={domainStyles.computedItem}>
                  <span className={domainStyles.computedLabel}>מע״מ תשומות ניתן לניכוי</span>
                  <span className={domainStyles.computedValue}>
                    {formatCurrency(summary.deductibleInputVat)}
                  </span>
                </div>
                <div className={domainStyles.computedItem}>
                  <span className={domainStyles.computedLabel}>מאזן מע״מ</span>
                  <span className={domainStyles.computedValue}>
                    {formatCurrency(summary.vatBalance)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.employeeBreakdownSection}>
            <div className={styles.sectionTitle}>פירוט לפי עובד/ת</div>
            <p className={domainStyles.hint}>
              כמה כל עובד/ת הביא/ה בהכנסות בתקופה שנבחרה. שוכרי כיסא אינם כלולים כאן — השכירות
              שלהם היא סכום קבוע חודשי, לא ביצוע.
            </p>
            <DataTable
              columns={employeeBreakdownColumns}
              rows={breakdown?.employees ?? []}
              rowKey={(r) => r.employeeId}
              loading={breakdownLoading}
              emptyMessage="אין עובדים עם הכנסות בתקופה שנבחרה"
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
