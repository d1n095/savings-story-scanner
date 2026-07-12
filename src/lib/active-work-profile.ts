import { supabase } from "@/integrations/supabase/client";
import type { OBRule } from "@/modules/salary/ob";

export type ActiveWorkProfile = {
  id: string;
  name: string;
  hourlyRate: number;
  taxRate: number;
  obRules: OBRule[];
  periodStartDay: number;
  paydayDay: number;
  paydayOffsetMonths: number;
  vacationPayPercent: number;
};

export async function getActiveWorkProfile(): Promise<ActiveWorkProfile | null> {
  const { data, error } = await supabase
    .from("work_profiles")
    .select(
      "id, name, hourly_rate, tax_rate, ob_rules, is_default, created_at, period_start_day, payday_day, payday_offset_months, vacation_pay_percent",
    )
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) throw error;
  const profile = data?.[0];
  if (!profile) return null;

  return {
    id: profile.id,
    name: profile.name,
    hourlyRate: Number(profile.hourly_rate ?? 0),
    taxRate: Number(profile.tax_rate ?? 30),
    obRules: (profile.ob_rules as OBRule[] | null) ?? [],
    periodStartDay: Number(profile.period_start_day ?? 1),
    paydayDay: Number(profile.payday_day ?? 25),
    paydayOffsetMonths: Number(profile.payday_offset_months ?? 1),
    vacationPayPercent: Number(profile.vacation_pay_percent ?? 12),
  };
}
