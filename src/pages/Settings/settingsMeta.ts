/**
 * How to render/edit each known setting key. settingValue is always a plain
 * string on the wire (system_settings.setting_value is a generic VARCHAR),
 * so this is what tells the UI "vat_rate is really a 0-1 fraction, show it
 * as a whole-number percent" — the same convention already used for
 * employee compensationPercentage and income/expense vatRate.
 *
 * A setting key with no entry here still works — it falls back to a plain
 * text field labeled with the backend's own `description`, so a future
 * setting added only via migration (no frontend change) is still usable,
 * just without the nicer percent treatment.
 */
export type SettingType = 'percent' | 'text';

interface SettingMeta {
  label: string;
  type: SettingType;
  hint?: string;
}

export const SETTING_META: Record<string, SettingMeta> = {
  vat_rate: {
    label: 'שיעור מע"מ ברירת מחדל',
    type: 'percent',
    hint: 'משמש כברירת מחדל בכל עסקת הכנסה או הוצאה חדשה, כשלא מוזן אחוז מע"מ ידנית',
  },
};
