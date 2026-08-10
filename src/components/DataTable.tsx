import type { ReactNode } from 'react';
import styles from './DataTable.module.css';

/**
 * One reusable table for every domain list screen (Employees today;
 * Suppliers/Categories/Income/Expenses/Goals/Audit Log later) — columns are
 * declared per-screen, the table itself doesn't know about any domain shape.
 */
export interface Column<T> {
  header: string;
  render: (row: T) => ReactNode;
  /** Defaults to 'start' (right-aligned in RTL); use 'end' for numeric columns. */
  align?: 'start' | 'end';
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  /** Shown instead of the table body when rows is empty. */
  emptyMessage?: string;
  /** Shown instead of rows while an initial fetch is in flight. */
  loading?: boolean;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  emptyMessage = 'לא נמצאו רשומות',
  loading = false,
}: DataTableProps<T>) {
  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th key={i} style={{ width: col.width, textAlign: col.align === 'end' ? 'end' : 'start' }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className={styles.status}>
                טוען…
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className={styles.status}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                className={onRowClick ? styles.clickable : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((col, i) => (
                  <td key={i} style={{ textAlign: col.align === 'end' ? 'end' : 'start' }}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
