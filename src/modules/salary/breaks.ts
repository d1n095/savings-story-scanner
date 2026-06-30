/**
 * Rastregler per arbetsprofil.
 * - mode: "off"   = aldrig automatisk rast
 *         "manual"= användaren anger rast själv på pass
 *         "auto"  = applicera trösklar nedan
 * - auto: [{ after_hours, minutes }] sorterad stigande på after_hours
 * - min_break_minutes: lägsta rast som tillåts manuellt (0 = inget krav)
 */
export type BreakRules = {
  mode: "off" | "manual" | "auto";
  auto: Array<{ after_hours: number; minutes: number }>;
  min_break_minutes: number;
};

export const DEFAULT_BREAK_RULES: BreakRules = {
  mode: "manual",
  auto: [
    { after_hours: 5, minutes: 30 },
    { after_hours: 8, minutes: 45 },
    { after_hours: 10, minutes: 60 },
  ],
  min_break_minutes: 0,
};

/** Räkna ut antal rastminuter för ett pass enligt regler. */
export function applyBreakRules(rules: BreakRules | null | undefined, shiftHours: number): number {
  if (!rules || rules.mode !== "auto") return 0;
  const sorted = [...rules.auto].sort((a, b) => a.after_hours - b.after_hours);
  let mins = 0;
  for (const r of sorted) {
    if (shiftHours >= r.after_hours) mins = r.minutes;
  }
  return mins;
}

export function normalizeBreakRules(x: unknown): BreakRules {
  const r = (x ?? {}) as Partial<BreakRules>;
  return {
    mode: (r.mode as BreakRules["mode"]) ?? "manual",
    auto: Array.isArray(r.auto) ? r.auto.filter((a: any) => typeof a?.after_hours === "number" && typeof a?.minutes === "number") : [],
    min_break_minutes: typeof r.min_break_minutes === "number" ? r.min_break_minutes : 0,
  };
}
