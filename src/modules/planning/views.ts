// Planning Engine — aggregeringar för dag/vecka/månad/kvartal/halvår/år.
import { holidaysForYear, isHelg } from "../calendar/holidays";
import { net } from "./tax";

export type ShiftRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  break_minutes: number;
  hourly_rate: number | null;
  base_amount: number | null;
  ob_amount: number | null;
  total_amount: number | null;
  title?: string | null;
  is_extra?: boolean | null;
};

export type AbsenceRow = {
  id: string;
  kind: "vacation" | "sick" | "vab" | "leave" | "other";
  starts_on: string; // YYYY-MM-DD
  ends_on: string; // YYYY-MM-DD
  paid: boolean;
};

export type DayAggregate = {
  date: string; // YYYY-MM-DD
  weekday: number; // 0=sön..6=lör
  isWeekend: boolean;
  isRed: boolean;
  redName?: string;
  hours: number;
  base: number;
  ob: number;
  gross: number;
  shifts: ShiftRow[];
  absences: AbsenceRow[];
};

export type RangeAggregate = {
  hours: number;
  base: number;
  ob: number;
  gross: number;
  netEstimate: number;
  shiftCount: number;
  redDays: number;
  vacationDays: number;
  sickDays: number;
  freeDays: number;
  days: DayAggregate[];
};

export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function eachDay(start: Date, end: Date): Date[] {
  const out: Date[] = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const stop = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (cur <= stop) {
    out.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function startOfWeek(d: Date): Date {
  // ISO: måndag som första dag
  const r = new Date(d);
  const w = (r.getDay() + 6) % 7;
  r.setDate(r.getDate() - w);
  r.setHours(0, 0, 0, 0);
  return r;
}
export function endOfWeek(d: Date): Date {
  const s = startOfWeek(d);
  s.setDate(s.getDate() + 6);
  return s;
}
export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
export function startOfYear(y: number): Date {
  return new Date(y, 0, 1);
}
export function endOfYear(y: number): Date {
  return new Date(y, 11, 31);
}

export function isoWeekNumber(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function dayHours(s: ShiftRow): number {
  return Math.max(
    0,
    (new Date(s.ends_at).getTime() - new Date(s.starts_at).getTime()) / 3600000 -
      (s.break_minutes ?? 0) / 60,
  );
}

export function aggregateRange(
  start: Date,
  end: Date,
  shifts: ShiftRow[],
  absences: AbsenceRow[],
  taxRate: number | null | undefined,
): RangeAggregate {
  const days = eachDay(start, end);
  const yearHolidays = new Map<number, ReturnType<typeof holidaysForYear>>();
  function holidaysFor(y: number) {
    if (!yearHolidays.has(y)) yearHolidays.set(y, holidaysForYear(y));
    return yearHolidays.get(y)!;
  }

  const out: DayAggregate[] = days.map((d) => {
    const key = isoDate(d);
    const red = holidaysFor(d.getFullYear()).find((h) => h.date === key && h.type === "red");
    const daysShifts = shifts.filter((s) => isoDate(new Date(s.starts_at)) === key);
    const daysAbs = absences.filter((a) => a.starts_on <= key && a.ends_on >= key);
    const hours = daysShifts.reduce((sum, s) => sum + dayHours(s), 0);
    const base = daysShifts.reduce((sum, s) => sum + Number(s.base_amount ?? 0), 0);
    const ob = daysShifts.reduce((sum, s) => sum + Number(s.ob_amount ?? 0), 0);
    return {
      date: key,
      weekday: d.getDay(),
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
      isRed: !!red || isHelg(d),
      redName: red?.name,
      hours,
      base,
      ob,
      gross: base + ob,
      shifts: daysShifts,
      absences: daysAbs,
    };
  });

  const hours = out.reduce((s, d) => s + d.hours, 0);
  const base = out.reduce((s, d) => s + d.base, 0);
  const ob = out.reduce((s, d) => s + d.ob, 0);
  const gross = base + ob;
  const redDays = out.filter((d) => d.isRed).length;
  const vacationDays = out.filter(
    (d) => d.absences.some((a) => a.kind === "vacation") && !d.isWeekend,
  ).length;
  const sickDays = out.filter((d) => d.absences.some((a) => a.kind === "sick")).length;
  const freeDays = out.filter((d) => d.shifts.length === 0 && d.absences.length === 0).length;
  const shiftCount = out.reduce((s, d) => s + d.shifts.length, 0);

  return {
    hours,
    base,
    ob,
    gross,
    netEstimate: net(gross, taxRate),
    shiftCount,
    redDays,
    vacationDays,
    sickDays,
    freeDays,
    days: out,
  };
}

export function aggregateByMonth(
  year: number,
  shifts: ShiftRow[],
  absences: AbsenceRow[],
  tax: number | null | undefined,
) {
  const months: RangeAggregate[] = [];
  for (let m = 0; m < 12; m++) {
    months.push(
      aggregateRange(new Date(year, m, 1), new Date(year, m + 1, 0), shifts, absences, tax),
    );
  }
  return months;
}
