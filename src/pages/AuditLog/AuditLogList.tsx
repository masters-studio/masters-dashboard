import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listAuditLogs, type AuditLog, type AuditLogListFilters } from '../../api/auditLogs';
import { translateApiError } from '../../api/errorMessages';
import { DataTable, type Column } from '../../components/DataTable';
import { DateField } from '../../components/DateField';
import domainStyles from '../../styles/domainScreen.module.css';
import styles from './AuditLog.module.css';
import {
  ENTITY_ROUTES,
  ENTITY_TYPE_LABELS,
  translateAction,
  translateEntityType,
  translateFieldName,
  translateValue,
} from './auditLogTranslations';

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('he-IL');
}

function actionBadgeClass(action: string): string {
  if (action === 'CREATE') return domainStyles.badgeActive;
  if (action === 'DELETE') return domainStyles.badgeInactive;
  return domainStyles.badgeNeutral;
}

/**
 * Read-only, deliberately -- AuditLogController exposes no write endpoints
 * at all (an audit trail a client could edit wouldn't be trustworthy as
 * one), so unlike every other domain screen there's no "new"/edit/delete
 * here, just filters over history. See auditLogTranslations.ts for why the
 * raw entityType/fieldName/value strings need translating at all even
 * though this data was never written with an audience in mind.
 */
export default function AuditLogList() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [entityIdFilter, setEntityIdFilter] = useState('');
  const [changedByFilter, setChangedByFilter] = useState('');
  const [fromFilter, setFromFilter] = useState('');
  const [toFilter, setToFilter] = useState('');

  const loadLogs = useCallback(() => {
    setLoading(true);
    setError(null);
    const filters: AuditLogListFilters = {};
    if (entityTypeFilter) filters.entityType = entityTypeFilter;
    if (entityIdFilter) filters.entityId = Number(entityIdFilter);
    if (changedByFilter) filters.changedBy = Number(changedByFilter);
    if (fromFilter) filters.from = fromFilter;
    if (toFilter) filters.to = toFilter;
    listAuditLogs(filters)
      .then(setLogs)
      .catch((err) => setError(translateApiError(err)))
      .finally(() => setLoading(false));
  }, [entityTypeFilter, entityIdFilter, changedByFilter, fromFilter, toFilter]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const columns: Column<AuditLog>[] = [
    { header: 'תאריך ושעה', render: (l) => formatTimestamp(l.changedAt), width: '160px' },
    {
      header: 'פעולה',
      render: (l) => (
        <span className={`${domainStyles.badge} ${actionBadgeClass(l.action)}`}>
          {translateAction(l.action)}
        </span>
      ),
    },
    { header: 'סוג ישות', render: (l) => translateEntityType(l.entityType) },
    {
      header: 'מזהה',
      render: (l) => {
        const route = ENTITY_ROUTES[l.entityType];
        return route ? (
          <Link to={`${route}/${l.entityId}`} className={styles.entityLink}>
            #{l.entityId}
          </Link>
        ) : (
          `#${l.entityId}`
        );
      },
    },
    { header: 'שדה', render: (l) => translateFieldName(l.fieldName) },
    { header: 'ערך ישן', render: (l) => translateValue(l.oldValue) },
    { header: 'ערך חדש', render: (l) => translateValue(l.newValue) },
    { header: 'בוצע ע"י', render: (l) => (l.changedBy != null ? `משתמש #${l.changedBy}` : '—') },
  ];

  return (
    <div>
      <div className={domainStyles.header}>
        <h1>
          יומן שינויים<span className="dot" />
        </h1>
      </div>

      {error && <p className={domainStyles.pageError}>{error}</p>}

      <div className={domainStyles.filters}>
        <select value={entityTypeFilter} onChange={(e) => setEntityTypeFilter(e.target.value)}>
          <option value="">כל סוגי הישויות</option>
          {Object.entries(ENTITY_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <div className={styles.filterWithHint}>
          <input
            type="number"
            placeholder="מזהה ישות"
            value={entityIdFilter}
            onChange={(e) => setEntityIdFilter(e.target.value)}
            style={{ width: '110px' }}
          />
          {entityIdFilter && !entityTypeFilter && (
            <span className={styles.filterHint}>בחרו גם סוג ישות – המספר לבדו לא ייחודי</span>
          )}
        </div>
        <input
          type="number"
          placeholder="מזהה משתמש"
          value={changedByFilter}
          onChange={(e) => setChangedByFilter(e.target.value)}
          style={{ width: '120px' }}
        />
        <DateField label="מתאריך" value={fromFilter} onChange={setFromFilter} />
        <DateField label="עד תאריך" value={toFilter} onChange={setToFilter} />
      </div>

      <DataTable
        columns={columns}
        rows={logs}
        rowKey={(l) => l.id}
        loading={loading}
        emptyMessage="לא נמצאו רשומות ביומן השינויים"
      />
    </div>
  );
}
