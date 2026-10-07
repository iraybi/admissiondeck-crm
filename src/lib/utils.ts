/* Small pure helpers used across UI and domain logic. */

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function formatMoney(n: number, currency = "BDT"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function daysFromToday(d: Date, today = new Date()): number {
  const a = new Date(d);
  a.setHours(12, 0, 0, 0);
  const b = new Date(today);
  b.setHours(12, 0, 0, 0);
  return Math.round((a.getTime() - b.getTime()) / 864e5);
}

export function pct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 100);
}
