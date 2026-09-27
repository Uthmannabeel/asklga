/** Display helpers shared by public and staff pages. */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * "30 Aug 2026" from an ISO date ("2026-08-30"), an ISO timestamp, or a Date. Timestamps are
 * shown in Africa/Lagos so a report filed at 00:30 WAT is not dated the previous day.
 */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "";
  if (typeof value === "string") {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (m) return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1] ?? m[2]} ${m[1]}`;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return formatDate(d);
  }
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", year: "numeric", month: "short", day: "numeric" }).formatToParts(value);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("day")} ${get("month")} ${get("year")}`;
}

/** ISO date (YYYY-MM-DD) of a timestamp in Africa/Lagos, for sorting and comparisons. */
export function isoDateLagos(value: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
