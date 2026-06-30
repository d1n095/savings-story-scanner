// Finance Engine — Money Score 0–100, baserat på beteende, inte saldo.
// Lokal beräkning. Inga AI-kostnader.

export type ScoreInput = {
  monthlyIncome: number;
  monthlyExpenses: number;
  recurringSubs: number;
  bufferMonths: number; // sparat / månadsutgifter
  daysWithoutImpulse: number; // streak
  plannedVsActualRatio: number; // 0..1 (hur nära budget man håller)
};

export type ScoreResult = {
  score: number;
  letter: "S" | "A" | "B" | "C" | "D";
  drivers: Array<{ label: string; delta: number; positive: boolean }>;
};

function clamp(v: number, lo = 0, hi = 100) { return Math.max(lo, Math.min(hi, v)); }

export function calcMoneyScore(i: ScoreInput): ScoreResult {
  const drivers: ScoreResult["drivers"] = [];
  let score = 50;

  const savingsRate = i.monthlyIncome > 0 ? (i.monthlyIncome - i.monthlyExpenses) / i.monthlyIncome : 0;
  const sr = clamp(savingsRate * 100, -50, 50);
  score += sr * 0.4;
  drivers.push({ label: "Sparkvot", delta: +(sr * 0.4).toFixed(0), positive: sr >= 0 });

  const buf = clamp(i.bufferMonths * 5, 0, 25);
  score += buf;
  drivers.push({ label: "Buffert (månader)", delta: +buf.toFixed(0), positive: buf > 0 });

  const subPenalty = Math.min(15, Math.max(0, i.recurringSubs - 200) / 100);
  score -= subPenalty;
  drivers.push({ label: "Prenumerationer", delta: -Math.round(subPenalty), positive: subPenalty === 0 });

  const streak = Math.min(10, i.daysWithoutImpulse / 3);
  score += streak;
  drivers.push({ label: "Impulsfri streak", delta: +streak.toFixed(0), positive: streak > 0 });

  const plan = (i.plannedVsActualRatio - 0.5) * 20;
  score += plan;
  drivers.push({ label: "Håller plan", delta: +plan.toFixed(0), positive: plan >= 0 });

  const final = Math.round(clamp(score));
  const letter: ScoreResult["letter"] =
    final >= 90 ? "S" : final >= 75 ? "A" : final >= 60 ? "B" : final >= 40 ? "C" : "D";

  return { score: final, letter, drivers };
}
