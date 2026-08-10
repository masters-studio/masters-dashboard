import { useEffect, useState } from 'react';
import { listSystemSettings, updateSystemSetting, type SystemSetting } from '../../api/systemSettings';
import { translateApiError } from '../../api/errorMessages';
import domainStyles from '../../styles/domainScreen.module.css';
import styles from './Settings.module.css';
import { SETTING_META } from './settingsMeta';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function displayValue(setting: SystemSetting): string {
  const meta = SETTING_META[setting.settingKey];
  if (meta?.type === 'percent') {
    return `${round2(Number(setting.settingValue) * 100)}%`;
  }
  return setting.settingValue;
}

/**
 * No create/delete here, unlike every other domain screen — settings are
 * developer-defined via migration, this only ever edits an existing key's
 * value. A short, growing list (one row today), so a single always-visible
 * card list with inline editing reads better than a DataTable + separate
 * edit route for what's really just "click a value, change it, save."
 */
export default function SettingsList() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    setError(null);
    listSystemSettings()
      .then(setSettings)
      .catch((err) => setError(translateApiError(err)))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function startEdit(setting: SystemSetting) {
    const meta = SETTING_META[setting.settingKey];
    setEditingKey(setting.settingKey);
    setEditValue(
      meta?.type === 'percent'
        ? String(round2(Number(setting.settingValue) * 100))
        : setting.settingValue,
    );
    setFieldError(null);
  }

  function cancelEdit() {
    setEditingKey(null);
    setFieldError(null);
  }

  async function save(setting: SystemSetting) {
    const meta = SETTING_META[setting.settingKey];
    let valueToSend: string;

    if (meta?.type === 'percent') {
      const pct = Number(editValue);
      if (!editValue || Number.isNaN(pct) || pct < 0 || pct > 100) {
        setFieldError('יש להזין אחוז תקין בין 0 ל-100');
        return;
      }
      valueToSend = String(pct / 100);
    } else {
      if (!editValue.trim()) {
        setFieldError('שדה חובה');
        return;
      }
      valueToSend = editValue.trim();
    }

    setSaving(true);
    setFieldError(null);
    try {
      await updateSystemSetting(setting.settingKey, valueToSend);
      setEditingKey(null);
      load();
    } catch (err) {
      setFieldError(translateApiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className={domainStyles.header}>
        <h1>
          הגדרות<span className="dot" />
        </h1>
      </div>

      {error && <p className={domainStyles.pageError}>{error}</p>}

      {loading ? (
        <p className={domainStyles.hint}>טוען…</p>
      ) : (
        <div className={styles.list}>
          {settings.map((setting) => {
            const meta = SETTING_META[setting.settingKey];
            const isEditing = editingKey === setting.settingKey;

            return (
              <div key={setting.settingKey} className={styles.card}>
                <div className={styles.cardLabel}>
                  {meta?.label ?? setting.description ?? setting.settingKey}
                </div>
                {meta?.hint && <div className={styles.cardHint}>{meta.hint}</div>}

                {isEditing ? (
                  <div className={styles.editRow}>
                    <div className={styles.editInputWrap}>
                      <input
                        type="number"
                        min="0"
                        max={meta?.type === 'percent' ? '100' : undefined}
                        step="0.01"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        autoFocus
                      />
                      {meta?.type === 'percent' && <span className={styles.percentSign}>%</span>}
                    </div>
                    {fieldError && <span className={domainStyles.fieldError}>{fieldError}</span>}
                    <div className={styles.editActions}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={saving}
                        onClick={() => save(setting)}
                      >
                        {saving ? 'שומר…' : 'שמירה'}
                      </button>
                      <button type="button" className="btn btn-ghost" disabled={saving} onClick={cancelEdit}>
                        ביטול
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.valueRow}>
                    <span className={styles.value}>{displayValue(setting)}</span>
                    <button type="button" className="btn btn-ghost" onClick={() => startEdit(setting)}>
                      עריכה
                    </button>
                  </div>
                )}

                {setting.updatedAt && (
                  <div className={styles.cardMeta}>
                    עודכן לאחרונה: {new Date(setting.updatedAt).toLocaleString('he-IL')}
                    {setting.updatedBy != null && ` • על ידי משתמש #${setting.updatedBy}`}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
