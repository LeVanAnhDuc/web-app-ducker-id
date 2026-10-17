// Calendar dates relative to today, for rules the app checks against "now"
// (date-of-birth bounds). Local time, like the client's date picker.

/** `yyyy-mm-dd` for today shifted by whole years and days. */
export function isoDateFromToday(years: number, days = 0): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + years);
  d.setDate(d.getDate() + days);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** `yyyy-mm-dd` → `dd/MM/yyyy`, the format the profile date input takes. */
export function toDisplayDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
