// Konfliktkoll, varningar & smart sammanfattning
import { isHelg, isRedDay } from "../calendar/holidays";

export type PlannedShift = {
  date: string; from: string; to: string; breakMinutes: number;
};

export type ExistingShift = {
  id: string; starts_at: string; ends_at: string;
};

export type ShiftWarning = {
  date: string;
  type: "overlap" | "long" | "midnight" | "no_break" | "duplicate";
  message: string;
};

function toRange(p: PlannedShift): { start: Date; end: Date } {
  const start = new Date(`${p.date}T${p.from}:00`);
  let end = new Date(`${p.date}T${p.to}:00`);
  if (end <= start) end = new Date(end.getTime() + 86400000);
  return { start, end };
}

export function detectWarnings(planned: PlannedShift[], existing: ExistingShift[]): ShiftWarning[] {
  const warns: ShiftWarning[] = [];
  const ranges = planned.map(p => ({ p, ...toRange(p) }));

  for (const { p, start, end } of ranges) {
    const hours = (end.getTime() - start.getTime()) / 3600000;

    if (hours > 10) warns.push({ date: p.date, type: "long", message: `${hours.toFixed(1)}h — ovanligt långt pass` });
    if (hours >= 6 && p.breakMinutes === 0) warns.push({ date: p.date, type: "no_break", message: "Ingen rast på ett 6h+ pass" });
    if (end.getDate() !== start.getDate()) warns.push({ date: p.date, type: "midnight", message: "Pass går över midnatt" });

    // Befintlig krock
    for (const ex of existing) {
      const es = new Date(ex.starts_at).getTime();
      const ee = new Date(ex.ends_at).getTime();
      if (es < end.getTime() && ee > start.getTime()) {
        warns.push({ date: p.date, type: "overlap", message: "Krockar med befintligt pass" });
        break;
      }
    }
  }

  // Dubbelregistrering inom inmatningen
  const seen = new Map<string, number>();
  for (const { p, start, end } of ranges) {
    const key = `${start.toISOString()}__${end.toISOString()}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  for (const [key, n] of seen) if (n > 1) {
    const date = key.split("T")[0];
    warns.push({ date, type: "duplicate", message: `Samma pass förekommer ${n}ggr i listan` });
  }

  return warns;
}

export type DaySummary = {
  date: string; weekday: number; isWeekend: boolean; isRed: boolean; redName?: string;
};

export function daySummaries(dates: string[]): DaySummary[] {
  return dates.map(d => {
    const date = new Date(`${d}T12:00:00`);
    const red = isRedDay(date);
    return {
      date: d,
      weekday: date.getDay(),
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      isRed: !!red || isHelg(date),
      redName: red?.name,
    };
  });
}
