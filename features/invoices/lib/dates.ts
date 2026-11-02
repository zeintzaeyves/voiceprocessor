/** Parses YYYY-MM-DD as a *local* calendar date (never shifted by time zone). */
function parseIsoDate(value: string): Date | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "Oct 10, 2026". Accepts a date or a full ISO timestamp; falls back to the input. */
export function formatDate(value: string | undefined): string {
  if (!value) return "—";
  const date = parseIsoDate(value);
  if (!date) return value;

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

/** "October 10, 2026", for documents. */
export function formatLongDate(value: string | undefined): string {
  if (!value) return "—";
  const date = parseIsoDate(value);
  if (!date) return value;

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  const a = parseIsoDate(from);
  const b = parseIsoDate(to);
  if (!a || !b) return 0;

  const MS_PER_DAY = 86_400_000;
  // Compare as UTC midnights so daylight-saving shifts cannot skew the count.
  const utc = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((utc(b) - utc(a)) / MS_PER_DAY);
}

/** "today", "tomorrow", "in 5 days", "3 days ago". */
export function describeDueDate(dueDate: string, today: string): string {
  if (!today) return formatDate(dueDate);
  const days = daysBetween(today, dueDate);

  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  return days > 0 ? `in ${days} days` : `${-days} days ago`;
}

/** Adds calendar days to YYYY-MM-DD. Returns the input unchanged if unparseable. */
export function addDays(value: string, days: number): string {
  const date = parseIsoDate(value);
  if (!date) return value;

  date.setDate(date.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}
