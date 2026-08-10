import { useEffect, useState } from 'react';
import { getDashboardSummary, type DashboardSummary } from '../api/dashboard';
import { listGoals } from '../api/goals';
import { type SimpleLookup } from '../api/lookups';
import { translateApiError } from '../api/errorMessages';
import { GOAL_TYPE_METRIC } from './Goals/goalConstants';
import { DonutChart } from '../components/DonutChart';
import domainStyles from '../styles/domainScreen.module.css';
import styles from './GoalProgress.module.css';

interface GoalProgressItem {
  goalType: string;
  target: number;
  actual: number;
  percentage: number;
}

interface CenterGroup {
  profitCenterId: number;
  profitCenterName: string;
  items: GoalProgressItem[];
}

interface GoalProgressProps {
  month: number;
  year: number;
  profitCenters: SimpleLookup[];
}

/**
 * "יעדים מול ביצוע" — one section per real profit centre (מספרה / אקדמיה /
 * מכירת מוצרים), always all three regardless of the page's own
 * business-wide/single-centre filter, since a goal chart for "the whole
 * business" wouldn't map to any one metric cleanly. Business-wide goals
 * (profitCenterId=null on Goal) are out of scope here for the same reason —
 * they still show up normally on the Goals screen.
 *
 * One small donut per goalType that (a) has a Goal row for this centre this
 * period and (b) is one of the four conventional types GOAL_TYPE_METRIC
 * knows how to compare (see that constant's javadoc) — a pie can't show
 * multiple independent goal types in a single ring, so multiple donuts side
 * by side per centre is the chosen layout. Flagged in the roadmap as
 * needing visual confirmation with the owner once something exists to show.
 */
export default function GoalProgress({ month, year, profitCenters }: GoalProgressProps) {
  const [groups, setGroups] = useState<CenterGroup[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profitCenters.length === 0) return;
    setLoading(true);
    setError(null);

    Promise.all([
      listGoals({ month, year }),
      ...profitCenters.map((c) => getDashboardSummary({ month, year, profitCenterId: c.id })),
    ])
      .then(([goals, ...summaries]) => {
        const summaryByCenter = new Map<number, DashboardSummary>(
          profitCenters.map((c, i) => [c.id, summaries[i]]),
        );

        const built: CenterGroup[] = profitCenters
          .map((center) => {
            const items: GoalProgressItem[] = goals
              .filter((g) => g.profitCenterId === center.id)
              .filter((g) => GOAL_TYPE_METRIC[g.goalType] != null)
              .map((g) => {
                const metric = GOAL_TYPE_METRIC[g.goalType];
                const summary = summaryByCenter.get(center.id);
                const actual = summary ? summary[metric] : 0;
                const percentage = g.targetAmount > 0 ? (actual / g.targetAmount) * 100 : 0;
                return { goalType: g.goalType, target: g.targetAmount, actual, percentage };
              });
            return { profitCenterId: center.id, profitCenterName: center.name, items };
          })
          .filter((group) => group.items.length > 0);

        setGroups(built);
      })
      .catch((err) => setError(translateApiError(err)))
      .finally(() => setLoading(false));
  }, [month, year, profitCenters]);

  if (profitCenters.length === 0) return null;

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>יעדים מול ביצוע</div>

      {error && <p className={domainStyles.pageError}>{error}</p>}

      {loading ? (
        <p className={domainStyles.hint}>טוען…</p>
      ) : groups && groups.length > 0 ? (
        groups.map((group) => (
          <div key={group.profitCenterId} className={styles.centerGroup}>
            <div className={styles.centerName}>{group.profitCenterName}</div>
            <div className={styles.donutRow}>
              {group.items.map((item) => (
                <DonutChart
                  key={item.goalType}
                  percentage={item.percentage}
                  label={item.goalType}
                  sublabel={`בפועל: ₪${Math.round(item.actual).toLocaleString('he-IL')} מתוך ₪${Math.round(
                    item.target,
                  ).toLocaleString('he-IL')}`}
                />
              ))}
            </div>
          </div>
        ))
      ) : (
        <p className={domainStyles.hint}>אין יעדים מוגדרים לתקופה שנבחרה.</p>
      )}
    </div>
  );
}
