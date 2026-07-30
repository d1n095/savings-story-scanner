// Calendar Source — gemensam adapter som projicerar alla källor till färgkodade dagshändelser.
// Framtida moduler (Health, Travel, Documents…) skriver bara till timeline_events med rätt kind.
import { holidaysForYear, isRedDay, type SwedishHoliday } from "./holidays";
import { namedaysFor } from "./namedays";
import type { CalendarProviderContribution } from "@/platform/calendar-provider";

export type EventKind =
  | "shift" | "expense" | "income" | "reminder" | "absence"
  | "holiday" | "nameday" | "signal" | "note"
  | "health" | "travel" | "document" | "module";

export type DayEvent = {
  id: string;
  kind: EventKind;
  title: string;
  subtitle?: string;
  amount?: number;
  from?: string; // HH:MM
  to?: string;
  color: string; // tailwind/oklch token klass
  dot: string; // bg color for indicator
  refTable?: string;
  refId?: string;
  /** Intern route som posten länkar till (modulbidrag). */
  deepLink?: string;
  /** Grupperingsetikett från modulen, t.ex. "Träning". */
  groupLabel?: string;
  raw?: any;
};

export type DaySummary = {
  date: string; // yyyy-mm-dd
  weekday: number; // 0..6 (mon=0)
  isToday: boolean;
  isWeekend: boolean;
  redDay?: SwedishHoliday;
  tradition?: SwedishHoliday;
  namedays: string[];
  events: DayEvent[];
  totals: {
    hours: number;
    gross: number;
    ob: number;
    expenses: number;
    incomes: number;
    shiftCount: number;
    hasVacation: boolean;
    hasSick: boolean;
    hasReminder: boolean;
  };
};

export type ShiftRow = {
  id: string; title?: string | null;
  starts_at: string; ends_at: string;
  break_minutes: number | null;
  base_amount?: number | null; ob_amount?: number | null; total_amount?: number | null;
  work_profile_id?: string | null;
};

export type ExpenseRow = {
  id: string; amount: number; category: string;
  description?: string | null; merchant?: string | null;
  occurred_at: string;
};

export type ReminderRow = {
  id: string; title: string; notes?: string | null;
  remind_at: string; done?: boolean | null;
};

export type AbsenceRow = {
  id: string; kind: "vacation" | "sick" | "vab" | "leave" | "other";
  starts_on: string; ends_on: string; note?: string | null;
};

export type TimelineEventRow = {
  id: string; kind: EventKind; title: string; subtitle?: string | null;
  occurs_at: string; ends_at?: string | null; amount?: number | null;
  icon?: string | null; color?: string | null;
  source_table?: string | null; source_id?: string | null;
};

export type Sources = {
  shifts?: ShiftRow[];
  expenses?: ExpenseRow[];
  reminders?: ReminderRow[];
  absences?: AbsenceRow[];
  timeline?: TimelineEventRow[];
  /** Bidrag från installerade och aktiva moduler via kalenderkontraktet. */
  contributions?: CalendarProviderContribution[];
};

export const KIND_META: Record<EventKind, { dot: string; label: string }> = {
  shift:    { dot: "bg-[oklch(0.65_0.18_240)]",  label: "Arbetspass" },
  income:   { dot: "bg-[oklch(0.7_0.16_150)]",   label: "Inkomst" },
  expense:  { dot: "bg-[oklch(0.65_0.18_25)]",   label: "Utgift" },
  reminder: { dot: "bg-[oklch(0.82_0.14_85)]",   label: "Påminnelse" },
  absence:  { dot: "bg-[oklch(0.65_0.16_300)]",  label: "Frånvaro" },
  holiday:  { dot: "bg-[oklch(0.65_0.18_25)]",   label: "Röd dag" },
  nameday:  { dot: "bg-[oklch(0.78_0.105_85)]",  label: "Namnsdag" },
  signal:   { dot: "bg-white/70",                label: "Insikt" },
  note:     { dot: "bg-[oklch(0.65_0.04_240)]",  label: "Anteckning" },
  health:   { dot: "bg-[oklch(0.7_0.12_165)]",   label: "Hälsa" },
  travel:   { dot: "bg-[oklch(0.7_0.14_210)]",   label: "Resa" },
  document: { dot: "bg-[oklch(0.6_0.04_85)]",    label: "Dokument" },
  module:   { dot: "bg-[oklch(0.72_0.13_140)]",  label: "Moduler" },
};

/** Semantisk ton -> designtoken. Kalendern äger färgvalet, inte modulen. */
export const TONE_DOT: Record<string, string> = {
  planned: "bg-[oklch(0.72_0.13_140)]",
  done: "bg-[oklch(0.7_0.16_150)]",
  cancelled: "bg-[oklch(0.6_0.04_240)]",
  info: "bg-white/70",
};

export function isoDateLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function timeHHMM(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function blankTotals(): DaySummary["totals"] {
  return { hours: 0, gross: 0, ob: 0, expenses: 0, incomes: 0, shiftCount: 0, hasVacation: false, hasSick: false, hasReminder: false };
}

export function buildDayIndex(rangeStart: Date, rangeEnd: Date, sources: Sources): Map<string, DaySummary> {
  const map = new Map<string, DaySummary>();
  const todayKey = isoDateLocal(new Date());

  // Initiera alla dagar i intervallet
  const years = new Set<number>();
  for (let d = new Date(rangeStart); d <= rangeEnd; d.setDate(d.getDate() + 1)) {
    years.add(d.getFullYear());
    const key = isoDateLocal(d);
    map.set(key, {
      date: key,
      weekday: (d.getDay() + 6) % 7,
      isToday: key === todayKey,
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
      namedays: namedaysFor(d),
      events: [],
      totals: blankTotals(),
    });
  }

  // Röda dagar & traditioner
  for (const year of years) {
    for (const h of holidaysForYear(year)) {
      const s = map.get(h.date);
      if (!s) continue;
      if (h.type === "red") {
        s.redDay = h;
        s.events.push({ id: `h-${h.date}`, kind: "holiday", title: h.name, color: "red", dot: KIND_META.holiday.dot });
      } else {
        s.tradition = h;
      }
    }
  }

  // Namnsdagar som event
  for (const [key, s] of map) {
    for (const n of s.namedays) {
      // Endast en gång per dag som event
      s.events.push({ id: `n-${key}-${n}`, kind: "nameday", title: n, subtitle: "Namnsdag", color: "gold", dot: KIND_META.nameday.dot });
    }
  }

  // Pass
  for (const sh of sources.shifts ?? []) {
    const key = isoDateLocal(new Date(sh.starts_at));
    const s = map.get(key);
    if (!s) continue;
    const start = new Date(sh.starts_at);
    const end = new Date(sh.ends_at);
    const breakH = (sh.break_minutes ?? 0) / 60;
    const hours = Math.max(0, (end.getTime() - start.getTime()) / 3600000 - breakH);
    s.events.push({
      id: `s-${sh.id}`, kind: "shift",
      title: sh.title || "Arbetspass",
      subtitle: `${timeHHMM(sh.starts_at)}–${timeHHMM(sh.ends_at)}`,
      amount: Number(sh.total_amount ?? 0),
      from: timeHHMM(sh.starts_at), to: timeHHMM(sh.ends_at),
      color: "blue", dot: KIND_META.shift.dot,
      refTable: "shifts", refId: sh.id, raw: sh,
    });
    s.totals.hours += hours;
    s.totals.gross += Number(sh.total_amount ?? 0);
    s.totals.ob += Number(sh.ob_amount ?? 0);
    s.totals.shiftCount += 1;
  }

  // Utgifter
  for (const ex of sources.expenses ?? []) {
    const key = isoDateLocal(new Date(ex.occurred_at));
    const s = map.get(key);
    if (!s) continue;
    s.events.push({
      id: `e-${ex.id}`, kind: "expense",
      title: ex.description || ex.merchant || "Utgift",
      subtitle: ex.category,
      amount: -Math.abs(Number(ex.amount)),
      color: "red", dot: KIND_META.expense.dot,
      refTable: "expenses", refId: ex.id, raw: ex,
    });
    s.totals.expenses += Number(ex.amount);
  }

  // Påminnelser
  for (const r of sources.reminders ?? []) {
    const key = isoDateLocal(new Date(r.remind_at));
    const s = map.get(key);
    if (!s) continue;
    s.events.push({
      id: `r-${r.id}`, kind: "reminder",
      title: r.title, subtitle: r.notes ?? timeHHMM(r.remind_at),
      from: timeHHMM(r.remind_at),
      color: "yellow", dot: KIND_META.reminder.dot,
      refTable: "reminders", refId: r.id, raw: r,
    });
    s.totals.hasReminder = true;
  }

  // Frånvaro (sträcker sig över intervall)
  for (const a of sources.absences ?? []) {
    const start = new Date(`${a.starts_on}T00:00:00`);
    const end = new Date(`${a.ends_on}T00:00:00`);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = isoDateLocal(d);
      const s = map.get(key);
      if (!s) continue;
      s.events.push({
        id: `a-${a.id}-${key}`, kind: "absence",
        title: a.kind === "vacation" ? "Semester" : a.kind === "sick" ? "Sjuk" : a.kind === "vab" ? "VAB" : a.kind === "leave" ? "Ledig" : "Frånvaro",
        subtitle: a.note ?? undefined,
        color: "purple", dot: KIND_META.absence.dot,
        refTable: "absences", refId: a.id, raw: a,
      });
      if (a.kind === "vacation") s.totals.hasVacation = true;
      if (a.kind === "sick") s.totals.hasSick = true;
    }
  }

  // Timeline (income, note, signal, m.m. — för framtida moduler)
  for (const t of sources.timeline ?? []) {
    const key = isoDateLocal(new Date(t.occurs_at));
    const s = map.get(key);
    if (!s) continue;
    const meta = KIND_META[t.kind] ?? KIND_META.note;
    s.events.push({
      id: `t-${t.id}`, kind: t.kind,
      title: t.title, subtitle: t.subtitle ?? undefined,
      amount: t.amount != null ? Number(t.amount) : undefined,
      color: t.color ?? meta.dot, dot: meta.dot,
      refTable: t.source_table ?? "timeline_events", refId: t.source_id ?? t.id, raw: t,
    });
    if (t.kind === "income" && t.amount != null) s.totals.incomes += Number(t.amount);
  }

  // Modulbidrag (Träning m.fl.) — kalendern äger inte datan, bara visningen.
  for (const c of sources.contributions ?? []) {
    const s = map.get(c.date);
    if (!s) continue;
    s.events.push({
      id: `m-${c.moduleId}-${c.id}`,
      kind: "module",
      title: c.title,
      subtitle: c.time ? `${c.time} · ${c.subtitle ?? ""}`.trim().replace(/ ·\s*$/, "") : c.subtitle,
      from: c.time,
      color: c.tone,
      dot: TONE_DOT[c.tone] ?? KIND_META.module.dot,
      refTable: c.sourceTable,
      refId: c.sourceId,
      deepLink: c.deepLink,
      groupLabel: c.providerLabel,
      raw: c,
    });
  }

  return map;
}

export { isRedDay };
