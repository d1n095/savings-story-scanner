// Rotationer — expandera mönster över ett datumintervall till konkreta pass.
import { isoDate, startOfWeek, eachDay } from "./views";

export type PatternDay = {
  weekday: number; // 0=sön..6=lör
  from?: string; // HH:MM
  to?: string;
  break_minutes?: number;
  off?: boolean;
};

export type WeeklyPattern = {
  id?: string;
  name: string;
  days_json: PatternDay[];
};

export type Rotation = {
  id?: string;
  name: string;
  cycle_weeks: number;
  weeks_json: PatternDay[][]; // varje vecka är en lista (vanligen 7 entries)
};

export type ExpandedShift = {
  date: string;
  from: string;
  to: string;
  breakMinutes: number;
};

export function expandWeekly(start: Date, end: Date, pattern: WeeklyPattern): ExpandedShift[] {
  const out: ExpandedShift[] = [];
  for (const d of eachDay(start, end)) {
    const wd = d.getDay();
    const entry = pattern.days_json.find((p) => p.weekday === wd);
    if (!entry || entry.off || !entry.from || !entry.to) continue;
    out.push({
      date: isoDate(d),
      from: entry.from,
      to: entry.to,
      breakMinutes: entry.break_minutes ?? 0,
    });
  }
  return out;
}

export function expandRotation(start: Date, end: Date, rot: Rotation): ExpandedShift[] {
  const cycle = Math.max(1, rot.cycle_weeks || rot.weeks_json.length || 1);
  const anchor = startOfWeek(start);
  const out: ExpandedShift[] = [];
  for (const d of eachDay(start, end)) {
    const weekIndex = Math.floor((startOfWeek(d).getTime() - anchor.getTime()) / (7 * 86400000));
    const wk = rot.weeks_json[((weekIndex % cycle) + cycle) % cycle] ?? [];
    const wd = d.getDay();
    const entry = wk.find((p) => p.weekday === wd);
    if (!entry || entry.off || !entry.from || !entry.to) continue;
    out.push({
      date: isoDate(d),
      from: entry.from,
      to: entry.to,
      breakMinutes: entry.break_minutes ?? 0,
    });
  }
  return out;
}

// Inbyggda presets
export const ROTATION_PRESETS: Rotation[] = [
  {
    name: "2-skift (dag/kväll)",
    cycle_weeks: 2,
    weeks_json: [
      [1, 2, 3, 4, 5].map((w) => ({ weekday: w, from: "06:00", to: "14:00", break_minutes: 30 })),
      [1, 2, 3, 4, 5].map((w) => ({ weekday: w, from: "14:00", to: "22:00", break_minutes: 30 })),
    ],
  },
  {
    name: "3-skift (dag/kväll/natt)",
    cycle_weeks: 3,
    weeks_json: [
      [1, 2, 3, 4, 5].map((w) => ({ weekday: w, from: "06:00", to: "14:00", break_minutes: 30 })),
      [1, 2, 3, 4, 5].map((w) => ({ weekday: w, from: "14:00", to: "22:00", break_minutes: 30 })),
      [1, 2, 3, 4, 5].map((w) => ({ weekday: w, from: "22:00", to: "06:00", break_minutes: 45 })),
    ],
  },
  {
    name: "Mån–fre 08–16",
    cycle_weeks: 1,
    weeks_json: [
      [1, 2, 3, 4, 5].map((w) => ({ weekday: w, from: "08:00", to: "16:00", break_minutes: 30 })),
    ],
  },
  {
    name: "Varannan helg 08–20",
    cycle_weeks: 2,
    weeks_json: [
      [
        { weekday: 6, from: "08:00", to: "20:00", break_minutes: 30 },
        { weekday: 0, from: "08:00", to: "20:00", break_minutes: 30 },
      ],
      [],
    ],
  },
];
