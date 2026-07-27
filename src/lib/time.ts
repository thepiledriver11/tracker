// Sydney-local time helpers. The server runs with TZ=Australia/Sydney, but we
// never rely on that alone — anything DST-sensitive goes through Intl here so a
// misconfigured TZ can't quietly shift the cron. AEST until 4 Oct 2026, AEDT after.

export const TZ = "Australia/Sydney";

/** Parts of `now` (or a given date) in Sydney local time. */
export function sydneyParts(d: Date = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-AU", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(d).map((p) => [p.type, p.value]),
  );
  // Intl gives "24" for midnight in some engines; normalise to "00".
  const hour = parts.hour === "24" ? "00" : parts.hour;
  const weekdayMap: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(hour),
    minute: Number(parts.minute),
    isoDate: `${parts.year}-${parts.month}-${parts.day}`,
    hhmm: `${hour}:${parts.minute}`,
    dayOfWeek: weekdayMap[parts.weekday as string] ?? 1,
  };
}

/** yyyy-mm-dd for "today" in Sydney. */
export function sydneyISODate(d: Date = new Date()): string {
  return sydneyParts(d).isoDate;
}

/** ISO day-of-week (1=Mon..7=Sun) for a Sydney date. */
export function sydneyDayOfWeek(d: Date = new Date()): number {
  return sydneyParts(d).dayOfWeek;
}

/**
 * A `@db.Date` column stores a calendar day. Prisma reads/writes it as a JS Date
 * at UTC midnight. Build such a Date from a yyyy-mm-dd string without letting the
 * local offset shift the day.
 */
export function dateOnly(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

/** The yyyy-mm-dd a `@db.Date` value represents, offset-safe. */
export function isoOf(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Format a Sydney date like "Mon 3 Aug". */
export function shortDate(iso: string): string {
  const d = dateOnly(iso);
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
}
