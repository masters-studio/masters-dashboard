import { useEffect, useState } from 'react';
import { HEBREW_MONTHS } from '../constants/hebrewMonths';
import styles from './DateField.module.css';

interface DateFieldProps {
  label?: string;
  /** ISO yyyy-mm-dd, matching what the API expects everywhere — same
   *  contract as the native `<input type="date">` this replaces, so no
   *  consuming form's validation/submit logic needs to change. */
  value: string;
  onChange: (value: string) => void;
  /** Hides the clear button — for a required form date that should never
   *  go back to empty (it's always pre-filled with today's date instead). */
  required?: boolean;
}

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

/**
 * Native `<input type="date">` renders its picker in whatever format the
 * visitor's OS locale dictates — confirmed empirically that neither the
 * page's dir/lang nor a lang="he" attribute on the input itself changes
 * that in this browser, so a user on an English-locale OS sees mm/dd/yyyy
 * no matter how Hebrew the rest of the page is. This is a plain three-part
 * control (day / Hebrew month name / year) instead, always in day-month-year
 * order regardless of the visitor's OS.
 */
export function DateField({ label, value, onChange, required }: DateFieldProps) {
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');

  // Stay in sync when the parent sets/clears the value externally (e.g.
  // edit-mode prefill, or a filter getting reset elsewhere).
  useEffect(() => {
    const [y, m, d] = value ? value.split('-') : ['', '', ''];
    setDay(d ? String(Number(d)) : '');
    setMonth(m ? String(Number(m)) : '');
    setYear(y || '');
  }, [value]);

  function commit(nextDay: string, nextMonth: string, nextYear: string) {
    setDay(nextDay);
    setMonth(nextMonth);
    setYear(nextYear);
    if (nextDay && nextMonth && nextYear.length === 4) {
      onChange(`${nextYear}-${nextMonth.padStart(2, '0')}-${nextDay.padStart(2, '0')}`);
    } else if (!nextDay && !nextMonth && !nextYear) {
      onChange('');
    }
    // Otherwise it's a partial selection (e.g. day+month chosen, year not
    // typed yet) — keep it visible locally, don't emit an invalid value.
  }

  return (
    <div className={styles.field}>
      {label && <span className={styles.label}>{label}</span>}
      <div className={styles.group}>
        <select
          className={styles.day}
          value={day}
          onChange={(e) => commit(e.target.value, month, year)}
          aria-label="יום"
        >
          <option value="">יום</option>
          {DAYS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <select
          className={styles.month}
          value={month}
          onChange={(e) => commit(day, e.target.value, year)}
          aria-label="חודש"
        >
          <option value="">חודש</option>
          {HEBREW_MONTHS.map((name, i) => (
            <option key={i} value={i + 1}>
              {name}
            </option>
          ))}
        </select>
        <input
          className={styles.year}
          type="number"
          placeholder="שנה"
          value={year}
          onChange={(e) => commit(day, month, e.target.value)}
          aria-label="שנה"
        />
        {!required && value && (
          <button
            type="button"
            className={styles.clear}
            onClick={() => commit('', '', '')}
            aria-label="נקה תאריך"
            title="נקה תאריך"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
