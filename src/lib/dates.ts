const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar date as YYYY-MM-DD */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parses YYYY-MM-DD as a local date (not UTC). */
export function fromISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

export function addMonths(d: Date, months: number): Date {
  const r = new Date(d);
  const day = r.getDate();
  r.setDate(1);
  r.setMonth(r.getMonth() + months);
  const lastDay = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
  r.setDate(Math.min(day, lastDay));
  return r;
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** First day of the month as YYYY-MM-01 */
export function monthKey(d: Date): string {
  return toISODate(startOfMonth(d));
}

export function daysBetween(a: Date, b: Date): number {
  const ms = startOfDay(b).getTime() - startOfDay(a).getTime();
  return Math.round(ms / 86_400_000);
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatMonth(d: Date, withYear = true): string {
  return withYear ? `${MONTHS[d.getMonth()]} ${d.getFullYear()}` : MONTHS[d.getMonth()];
}

export function formatDay(d: Date): string {
  const diff = daysBetween(d, new Date());
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff === -1) return 'Tomorrow';
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${sameYear ? '' : ` ${d.getFullYear()}`}`;
}

export function formatTime(d: Date): string {
  const h = d.getHours();
  return `${((h + 11) % 12) + 1}:${pad(d.getMinutes())} ${h < 12 ? 'AM' : 'PM'}`;
}

/** "HH:MM" (24h) → "5:30 PM" */
export function formatClock(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return formatTime(d);
}

/** Local date + optional "HH:MM" as a Date (time defaults to the end of the day). */
export function dueAt(due: string, time: string | null): Date {
  const d = fromISODate(due);
  if (time) {
    const [h, m] = time.split(':').map(Number);
    d.setHours(h, m, 0, 0);
  } else {
    d.setHours(23, 59, 59, 999);
  }
  return d;
}

/** "Today · 5:30 PM", "Tomorrow", "12 Nov · 9:00 AM" */
export function formatDue(due: string, time: string | null): string {
  const day = formatDay(fromISODate(due));
  return time ? `${day} · ${formatClock(time)}` : day;
}
