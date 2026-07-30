// Semesterplanering — analys av valt intervall
import { holidaysForYear } from "../calendar/holidays";
import { eachDay, isoDate, type ShiftRow } from "./views";

export type VacationAnalysis = {
  vacationDaysUsed: number; // vardagar inom perioden (mån-fre, ej röd)
  totalFreeDays: number; // dagar utan jobb-pass (inkl helg, röd, semester)
  affectedShifts: ShiftRow[];
  lostOB: number;
  lostBase: number;
  stretchTips: { addDate: string; label: string; extraFree: number }[];
};

function isRedKey(year: number, key: string): boolean {
  return holidaysForYear(year).some((h) => h.date === key && h.type === "red");
}

export function analyzeVacation(start: Date, end: Date, shifts: ShiftRow[]): VacationAnalysis {
  const days = eachDay(start, end);
  let vacationDaysUsed = 0;
  let totalFreeDays = 0;
  for (const d of days) {
    const key = isoDate(d);
    const isSun = d.getDay() === 0,
      isSat = d.getDay() === 6;
    const red = isRedKey(d.getFullYear(), key);
    if (!isSun && !isSat && !red) vacationDaysUsed++;
    totalFreeDays++;
  }
  const startMs = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const endMs = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1).getTime();
  const affectedShifts = shifts.filter((s) => {
    const t = new Date(s.starts_at).getTime();
    return t >= startMs && t < endMs;
  });
  const lostBase = affectedShifts.reduce((sum, s) => sum + Number(s.base_amount ?? 0), 0);
  const lostOB = affectedShifts.reduce((sum, s) => sum + Number(s.ob_amount ?? 0), 0);

  // Stretch tips: pröva lägga till dag före/efter
  const tips: VacationAnalysis["stretchTips"] = [];
  const tryStretch = (offset: -1 | 1) => {
    const ref = offset === -1 ? new Date(start) : new Date(end);
    ref.setDate(ref.getDate() + offset);
    const key = isoDate(ref);
    const isWeekend = ref.getDay() === 0 || ref.getDay() === 6;
    const red = isRedKey(ref.getFullYear(), key);
    if (isWeekend || red) return; // ingen mening
    // räkna kedjan av röd/helg på andra sidan
    let extra = 1; // dagen själv
    const probe = new Date(ref);
    probe.setDate(probe.getDate() + offset);
    while (
      probe.getDay() === 0 ||
      probe.getDay() === 6 ||
      isRedKey(probe.getFullYear(), isoDate(probe))
    ) {
      extra++;
      probe.setDate(probe.getDate() + offset);
    }
    if (extra > 1) {
      tips.push({
        addDate: key,
        label:
          offset === -1 ? `Ta även ${key} → +${extra} lediga` : `Ta även ${key} → +${extra} lediga`,
        extraFree: extra,
      });
    }
  };
  tryStretch(-1);
  tryStretch(1);

  return { vacationDaysUsed, totalFreeDays, affectedShifts, lostOB, lostBase, stretchTips: tips };
}
