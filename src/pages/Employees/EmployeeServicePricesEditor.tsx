import { useEffect, useState } from 'react';
import { listServices, type ServiceLookup } from '../../api/lookups';
import {
  listEmployeeServicePrices,
  setEmployeeServicePrice,
  type EmployeeServicePrice,
} from '../../api/employeeServicePrices';
import { translateApiError } from '../../api/errorMessages';
import domainStyles from '../../styles/domainScreen.module.css';
import styles from './EmployeeServicePricesEditor.module.css';

interface EmployeeServicePricesEditorProps {
  employeeId: number;
}

/**
 * Price list (task #99) — exactly two fixed services (see Service.java's
 * javadoc), always both shown, one inline-editable row each. Price = what
 * the customer pays (gross amount), used by the quick income-entry screen
 * to auto-fill grossAmount instead of typing it in. Changes are
 * forward-only: saving here only affects new income entries from now on,
 * never edits past ones.
 */
export default function EmployeeServicePricesEditor({ employeeId }: EmployeeServicePricesEditorProps) {
  const [services, setServices] = useState<ServiceLookup[]>([]);
  const [prices, setPrices] = useState<EmployeeServicePrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    setError(null);
    Promise.all([listServices(), listEmployeeServicePrices(employeeId)])
      .then(([svc, prc]) => {
        setServices(svc);
        setPrices(prc);
      })
      .catch((err) => setError(translateApiError(err)))
      .finally(() => setLoading(false));
  }

  useEffect(load, [employeeId]);

  function startEdit(serviceId: number) {
    const existing = prices.find((p) => p.serviceId === serviceId);
    setEditingServiceId(serviceId);
    setEditValue(existing ? String(existing.price) : '');
    setFieldError(null);
  }

  function cancelEdit() {
    setEditingServiceId(null);
    setFieldError(null);
  }

  async function save(serviceId: number) {
    const amount = Number(editValue);
    if (!editValue || Number.isNaN(amount) || amount <= 0) {
      setFieldError('יש להזין מחיר תקין גדול מ-0');
      return;
    }
    setSaving(true);
    setFieldError(null);
    try {
      await setEmployeeServicePrice(employeeId, serviceId, amount);
      setEditingServiceId(null);
      load();
    } catch (err) {
      setFieldError(translateApiError(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className={domainStyles.hint}>טוען מחירון…</p>;
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.title}>מחירון שירותים</div>
      <p className={domainStyles.hint}>
        המחיר שהלקוח משלם. שינוי מחיר משפיע רק על עסקאות חדשות מכאן ואילך.
      </p>

      {error && <p className={domainStyles.pageError}>{error}</p>}

      <div className={styles.list}>
        {services.map((service) => {
          const existing = prices.find((p) => p.serviceId === service.id);
          const isEditing = editingServiceId === service.id;

          return (
            <div key={service.id} className={styles.row}>
              <span className={styles.serviceName}>{service.name}</span>

              {isEditing ? (
                <div className={styles.editRow}>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    autoFocus
                  />
                  {fieldError && <span className={domainStyles.fieldError}>{fieldError}</span>}
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={saving}
                    onClick={() => save(service.id)}
                  >
                    {saving ? 'שומר…' : 'שמירה'}
                  </button>
                  <button type="button" className="btn btn-ghost" disabled={saving} onClick={cancelEdit}>
                    ביטול
                  </button>
                </div>
              ) : (
                <div className={styles.valueRow}>
                  <span className={styles.value}>
                    {existing != null ? `₪${existing.price.toLocaleString('he-IL')}` : 'לא הוגדר מחיר'}
                  </span>
                  <button type="button" className="btn btn-ghost" onClick={() => startEdit(service.id)}>
                    {existing != null ? 'עריכה' : 'הגדרת מחיר'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
