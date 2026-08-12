import { useState } from 'react';

interface Props {
  label?: string;
  onExport: () => Promise<void>;
}

/** Triggers a CSV download (see api/export.ts) with its own loading/error state,
 *  reused next to the "new" button on every list-style screen. */
export function ExportButton({ label = 'ייצוא ל-CSV', onExport }: Props) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setExporting(true);
    setError(null);
    try {
      await onExport();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הייצוא נכשל');
    } finally {
      setExporting(false);
    }
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <button type="button" className="btn btn-ghost" onClick={handleClick} disabled={exporting}>
        {exporting ? 'מייצא…' : label}
      </button>
      {error && <span style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</span>}
    </span>
  );
}
