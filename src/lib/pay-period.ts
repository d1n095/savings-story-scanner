/**
 * Pay Period Engine
 *
 * Pure functions for computing salary period boundaries and payout dates.
 *
 * Key rule (spec): "Intjänat ≠ utbetalt. Lön betalas för en TIDIGARE period."
 * - "Intjänat denna period" = shifts earned but not yet paid
 * - "Nästa utbetalning" = the date the current period will be paid out
 */

export type PeriodConfig = {
  /** Day of month when a new pay period starts (1–28). Default: 1. */
  periodStartDay: number;
  /** Day of month when salary is paid out (1–31). Default: 25. */
  paydayDay: number;
  /** How many months after period end until payday (0 or 1). Default: 1. */
  paydayOffsetMonths: number;
};

export type PayPeriod = {
  /** ISO date string (YYYY-MM-DD) — inclusive start of the earning period. */
  periodStart: string;
  /** ISO date string (YYYY-MM-DD) — inclusive end of the earning period. */
  periodEnd: string;
  /** ISO date string (YYYY-MM-DD) — the date this period's salary is paid. */
  payday: string;
  /** Human-readable label e.g. "16 jun – 15 jul" */
  label: string;
};

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addMonths(date: Date, n: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

function clampDay(year: number, month: number, day: number): Date {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, lastDay));
}

/**
 * Compute the current pay period for a given reference date.
 *
 * If periodStartDay = 16:
 *   - If today >= 16: period is this month's 16th → next month's 15th
 *   - If today < 16:  period is last month's 16th → this month's 15th
 */
export function currentPayPeriod(config: PeriodConfig, referenceDate?: Date): PayPeriod {
  const { periodStartDay, paydayDay, paydayOffsetMonths } = config;
  const ref = referenceDate ?? new Date();
  const today = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());

  // Determine which period month we're in
  const startThisMonth = clampDay(today.getFullYear(), today.getMonth(), periodStartDay);

  let periodStart: Date;
  if (today >= startThisMonth) {
    // We've passed this month's period start → current period started this month
    periodStart = startThisMonth;
  } else {
    // Haven't reached this month's period start → current period started last month
    periodStart = clampDay(today.getFullYear(), today.getMonth() - 1, periodStartDay);
  }

  // Period ends the day before next period starts
  const nextPeriodStart = clampDay(
    periodStart.getFullYear(),
    periodStart.getMonth() + 1,
    periodStartDay,
  );
  const periodEnd = new Date(nextPeriodStart.getTime() - 86400000);

  // Payday: periodEnd month + offset months, on payday_day
  const paydayBase = addMonths(periodEnd, paydayOffsetMonths);
  const payday = clampDay(paydayBase.getFullYear(), paydayBase.getMonth(), paydayDay);

  const label = formatPeriodLabel(periodStart, periodEnd);

  return {
    periodStart: isoDate(periodStart),
    periodEnd: isoDate(periodEnd),
    payday: isoDate(payday),
    label,
  };
}

/**
 * Compute the PREVIOUS pay period (the one that was or will be paid most recently).
 */
export function previousPayPeriod(config: PeriodConfig, referenceDate?: Date): PayPeriod {
  const { periodStartDay } = config;
  const ref = referenceDate ?? new Date();
  const todayFull = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());

  // Go one month back from current period start
  const current = currentPayPeriod(config, todayFull);
  const prevStart = clampDay(
    new Date(current.periodStart).getFullYear(),
    new Date(current.periodStart).getMonth() - 1,
    periodStartDay,
  );
  return currentPayPeriod(config, new Date(prevStart.getFullYear(), prevStart.getMonth(), prevStart.getDate() + 1));
}

/**
 * Given a shift start date (ISO string), return true if it falls within the period.
 */
export function isInPeriod(period: PayPeriod, startsAt: string): boolean {
  const d = startsAt.slice(0, 10);
  return d >= period.periodStart && d <= period.periodEnd;
}

function formatPeriodLabel(start: Date, end: Date): string {
  const months = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
  const startStr = `${start.getDate()} ${months[start.getMonth()]}`;
  const endStr = `${end.getDate()} ${months[end.getMonth()]}`;
  if (start.getFullYear() !== end.getFullYear()) {
    return `${startStr} ${start.getFullYear()} – ${endStr} ${end.getFullYear()}`;
  }
  return `${startStr} – ${endStr}`;
}

/** Format a payday date for display: "25 juli" */
export function formatPayday(isoDateStr: string): string {
  const months = ["januari", "februari", "mars", "april", "maj", "juni", "juli", "augusti", "september", "oktober", "november", "december"];
  const d = new Date(isoDateStr + "T12:00:00");
  return `${d.getDate()} ${months[d.getMonth()]}`;
}
