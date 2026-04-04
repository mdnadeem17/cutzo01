/**
 * Standardized time parsing and comparison for CUTZO
 */

/** "HH:mm" (24h) → total minutes since midnight */
export function timeToMins(t: string): number {
  const parts = t.split(":");
  let h = parseInt(parts[0], 10);
  let m = parseInt(parts[1], 10);
  
  // Handle 12h format if it accidentally slips in
  if (t.toUpperCase().includes("AM") || t.toUpperCase().includes("PM")) {
    const isPM = t.toUpperCase().includes("PM");
    if (isPM && h !== 12) h += 12;
    if (!isPM && h === 12) h = 0;
    // Extract minutes correctly from "hh:mm PM"
    const minPart = parts[1].split(" ")[0];
    m = parseInt(minPart, 10);
  }

  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

/** total minutes → "HH:mm" (24h) */
export function minsToTime24(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "HH:mm" (24h) → "hh:mm AM/PM" */
export function time24To12(t24: string): string {
  const parts = t24.split(":");
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** 
 * Check if a slot is in the past compared to current client time (passed as nowMs).
 * Date format: "YYYY-MM-DD"
 * Time format: "HH:mm" (24h)
 * 
 * IMPORTANT: We do NOT append a timezone offset here. The `nowMs` value is
 * sourced from Date.now() in the client browser, which gives UTC milliseconds.
 * Parsing `date + time` without any suffix gives "local time" which is then
 * converted to UTC by the JS engine — making both sides comparable in UTC ms.
 * Previously, hardcoding `+05:30` (IST) caused a 5.5h error for non-IST users.
 */
export function isPastTime(date: string, time: string, nowMs: number, tzOffset: number = 0): boolean {
  try {
    const [year, month, day] = date.split("-").map(Number);
    const [h, m] = time.split(":").map(Number);
    // Parse it as UTC, then apply the offset to get true absolute milliseconds
    const slotTrueAbsoluteMs = Date.UTC(year, month - 1, day, h, m) + (tzOffset * 60000);
    return slotTrueAbsoluteMs < nowMs;
  } catch (e) {
    return false;
  }
}

/** 
 * Check if a time is between start and end (inclusive start, exclusive end)
 */
export function isDuring(time: string, start: string, end: string): boolean {
  const t = timeToMins(time);
  const s = timeToMins(start);
  const e = timeToMins(end);
  return t >= s && t < e;
}

