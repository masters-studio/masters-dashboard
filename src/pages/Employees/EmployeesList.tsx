import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  deactivateEmployee,
  listEmployees,
  type Employee,
  type EmployeeListFilters,
} from '../../api/employees';
import {
  listCompensationModels,
  listEmployeeTypes,
  listProfitCenters,
  type CompensationModelLookup,
  type EmployeeTypeLookup,
  type SimpleLookup,
} from '../../api/lookups';
import { translateApiError } from '../../api/errorMessages';
import { DataTable, type Column } from '../../components/DataTable';
import styles from '../../styles/domainScreen.module.css';

export default function EmployeesList() {
  const navigate = useNavigate();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeTypes, setEmployeeTypes] = useState<EmployeeTypeLookup[]>([]);
  const [profitCenters, setProfitCenters] = useState<SimpleLookup[]>([]);
  const [compensationModels, setCompensationModels] = useState<CompensationModelLookup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [profitCenterFilter, setProfitCenterFilter] = useState<string>('');
  const [employeeTypeFilter, setEmployeeTypeFilter] = useState<string>('');
  const [includeInactive, setIncludeInactive] = useState(false);

  // Lookups rarely change within a session — fetch once, independent of filters.
  useEffect(() => {
    Promise.all([listEmployeeTypes(), listProfitCenters(), listCompensationModels()])
      .then(([types, centers, models]) => {
        setEmployeeTypes(types);
        setProfitCenters(centers);
        setCompensationModels(models);
      })
      .catch((err) => setError(translateApiError(err)));
  }, []);

  const loadEmployees = useCallback(() => {
    setLoading(true);
    setError(null);
    const filters: EmployeeListFilters = { includeInactive };
    if (profitCenterFilter) filters.profitCenterId = Number(profitCenterFilter);
    if (employeeTypeFilter) filters.employeeTypeId = Number(employeeTypeFilter);
    listEmployees(filters)
      .then(setEmployees)
      .catch((err) => setError(translateApiError(err)))
      .finally(() => setLoading(false));
  }, [profitCenterFilter, employeeTypeFilter, includeInactive]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const employeeTypeName = useMemo(() => {
    const map = new Map(employeeTypes.map((t) => [t.id, t.name]));
    return (id: number) => map.get(id) ?? '—';
  }, [employeeTypes]);

  const profitCenterName = useMemo(() => {
    const map = new Map(profitCenters.map((c) => [c.id, c.name]));
    return (id: number) => map.get(id) ?? '—';
  }, [profitCenters]);

  const compensationModelById = useMemo(
    () => new Map(compensationModels.map((m) => [m.id, m])),
    [compensationModels],
  );

  function compensationSummary(employee: Employee): string {
    const model = compensationModelById.get(employee.compensationModelId);
    if (!model) return '—';
    if (model.code === 'PERCENTAGE' && employee.compensationPercentage != null) {
      return `${(employee.compensationPercentage * 100).toFixed(0)}%`;
    }
    if (employee.fixedAmount != null) {
      return `₪${employee.fixedAmount.toLocaleString('he-IL')}`;
    }
    return '—';
  }

  async function handleDeactivate(employee: Employee) {
    if (!window.confirm(`להשבית את ${employee.name}?`)) return;
    setBusyId(employee.id);
    setError(null);
    try {
      await deactivateEmployee(employee.id);
      loadEmployees();
    } catch (err) {
      setError(translateApiError(err));
    } finally {
      setBusyId(null);
    }
  }

  const columns: Column<Employee>[] = [
    { header: 'קוד', render: (e) => e.employeeCode ?? '—', width: '90px' },
    { header: 'שם', render: (e) => e.name },
    { header: 'סוג עובד', render: (e) => employeeTypeName(e.employeeTypeId) },
    { header: 'מרכז רווח', render: (e) => profitCenterName(e.profitCenterId) },
    { header: 'תגמול', render: compensationSummary, align: 'end' },
    {
      header: 'סטטוס',
      render: (e) => (
        <span className={`${styles.badge} ${e.active ? styles.badgeActive : styles.badgeInactive}`}>
          {e.active ? 'פעיל' : 'לא פעיל'}
        </span>
      ),
    },
    {
      header: '',
      render: (e) => (
        <div className={styles.actionCell} onClick={(evt) => evt.stopPropagation()}>
          {e.active && (
            <button
              type="button"
              className="btn btn-danger"
              disabled={busyId === e.id}
              onClick={() => handleDeactivate(e)}
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
          עובדים<span className="dot" />
        </h1>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/employees/new')}>
          עובד חדש
        </button>
      </div>

      {error && <p className={styles.pageError}>{error}</p>}

      <div className={styles.filters}>
        <select value={employeeTypeFilter} onChange={(e) => setEmployeeTypeFilter(e.target.value)}>
          <option value="">כל סוגי העובדים</option>
          {employeeTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select value={profitCenterFilter} onChange={(e) => setProfitCenterFilter(e.target.value)}>
          <option value="">כל מרכזי הרווח</option>
          {profitCenters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
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
        rows={employees}
        rowKey={(e) => e.id}
        onRowClick={(e) => navigate(`/employees/${e.id}`)}
        loading={loading}
        emptyMessage="לא נמצאו עובדים"
      />
    </div>
  );
}
