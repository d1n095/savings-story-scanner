// Modulens interna typer. Ren data — inga UI- eller klientberoenden.
import type { BreakRules } from "@/modules/salary/breaks";

/** Sammanslagen profil: arbetsprofilens värden med profilen som fallback. */
export interface PlanningProfile {
  hourly_rate: number;
  tax_rate: number;
  ob_rules: unknown;
  break_rules: BreakRules;
  work_profile_id: string | null;
  work_profile_name: string | null;
}

/** Rad ur `expenses` som insiktsmotorn behöver. */
export interface InsightExpenseRow {
  amount: number | string;
  is_recurring: boolean | null;
}

/** Rad ur `shifts` som insiktsmotorn behöver. */
export interface InsightShiftRow {
  total_amount: number | string | null;
}
