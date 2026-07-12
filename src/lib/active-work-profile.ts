import { supabase } from "@/integrations/supabase/client";
import type { OBRule } from "@/modules/salary/ob";

export type ActiveWorkProfile = {
  id: string;
  name: string;
  hourlyRate: number;
  taxRate: number;
  obRules: OBRule[];
};

export async function getActiveWorkProfile(): Promise<ActiveWorkProfile | null> {
  const { data, error } = await supabase
    .from("work_profiles")
    .select("id, name, hourly_rate, tax_rate, ob_rules, is_default, created_at")
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
  };
}
