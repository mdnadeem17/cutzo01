/**
 * Standardized time parsing and comparison for TRIMO
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
  let h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** 
 * Check if a slot is in the past compared to current server time.
 * Date format: "YYYY-MM-DD"
 * Time format: "HH:mm" (24h)
 */
export function isPastTime(date: string, time: string, nowMs: number): boolean {
  try {
    // Basic UTC comparison (fallback)
    // IMPORTANT: We append +05:30 (IST) because the trimo-booking strings are local to India.
    // Without this, the Convex UTC environment treats them as UTC, causing a 5.5h error.
    const slotDate = new Date(`${date}T${time}:00+05:30`);
    
    // Safety check: if construction fails or results in NaN, fall back to simple construction
    if (isNaN(slotDate.getTime())) {
      const fallbackDate = new Date(`${date}T${time}:00`);
      return fallbackDate.getTime() < nowMs;
    }

    return slotDate.getTime() < nowMs;
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
