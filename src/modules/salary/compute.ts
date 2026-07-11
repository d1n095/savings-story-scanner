// Central helper: räkna ut base/ob/total för ett pass utifrån profil + passtyp.
// Används av både snabb-flödet, schema-import och /jobb så vi aldrig får 0 kr efter import.

import { calculateShift, DEFAULT_OB_RULES, type OBRule } from "./ob";

export type ShiftType = "regular" | "waking_on_call" | "sleeping_on_call" | "standby";

type ProfileLike = {
  hourly_rate?: number | null;
  waking_on_call_rate?: number | null;
  sleeping_on_call_rate?: number | null;
  standby_rate?: number | null;
  on_call_rate?: number | null;
  callout_rate?: number | null;
  ob_rules?: unknown;
};

export type ComputeInput = {
  startsAt: Date;
  endsAt: Date;
  breakMinutes: number;
  shiftType: ShiftType;
  activeMinutes: number;
  profile: ProfileLike | null | undefined;
  /** Fallback om profilens ob_rules är tomma. */
  fallbackObRules?: OBRule[];
};

export type ComputeResult = {
  hourly_rate: number;
  base_amount: number;
  ob_amount: number;
  total_amount: number;
  on_call_hours: number | null;
  active_minutes: number;
  break_minutes: number;
};

export function pickHourlyRate(p: ProfileLike | null | undefined, type: ShiftType): number {
  const base = Number(p?.hourly_rate ?? 0);
  if (type === "regular") return base;
  if (type === "waking_on_call") return Number(p?.waking_on_call_rate ?? p?.on_call_rate ?? base);
  if (type === "sleeping_on_call") return Number(p?.sleeping_on_call_rate ?? p?.on_call_rate ?? base);
  if (type === "standby") return Number(p?.standby_rate ?? base);
  return base;
}

function normalizeObRules(x: unknown, fallback: OBRule[]): OBRule[] {
  if (Array.isArray(x) && x.length > 0) return x as OBRule[];
  return fallback;
}

/**
 * Räkna belopp för ett pass.
 * - Vanligt: full lön × timmar (minus rast) + OB enligt regler.
 * - Vaken jour: jour-timlön × timmar + OB enligt regler.
 * - Sovande jour / Beredskap: jour-timlön × timmar + aktiv tid som utryckning
 *   (callout_rate om satt, annars vanlig timlön).
 */
export function computeShiftAmounts(input: ComputeInput): ComputeResult {
  const { startsAt, endsAt, breakMinutes, shiftType, activeMinutes, profile } = input;
  const rate = pickHourlyRate(profile, shiftType);
  const obRules = normalizeObRules(profile?.ob_rules, input.fallbackObRules ?? DEFAULT_OB_RULES);
  const totalHours = Math.max(0, (endsAt.getTime() - startsAt.getTime()) / 3600000);
  const effectiveBreak = shiftType === "regular" ? breakMinutes : 0;

  const calc = calculateShift({
    startsAt,
    endsAt,
    breakMinutes: effectiveBreak,
    hourlyRate: rate,
    obRules,
  });

  let base = calc.baseAmount;
  let ob = calc.obAmount;

  // Extra utryckningsersättning vid sovande/beredskap
  if ((shiftType === "sleeping_on_call" || shiftType === "standby") && activeMinutes > 0) {
    const calloutRate = Number(profile?.callout_rate ?? profile?.hourly_rate ?? rate);
    const extra = (activeMinutes / 60) * calloutRate;
    base += extra;
  }

  return {
    hourly_rate: rate,
    base_amount: +base.toFixed(2),
    ob_amount: +ob.toFixed(2),
    total_amount: +(base + ob).toFixed(2),
    on_call_hours: shiftType === "regular" ? null : +totalHours.toFixed(2),
    active_minutes: shiftType === "regular" ? 0 : activeMinutes,
    break_minutes: effectiveBreak,
  };
}

/** Kollar om två tidsintervall överlappar. */
export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart.getTime() < bEnd.getTime() && aEnd.getTime() > bStart.getTime();
}
