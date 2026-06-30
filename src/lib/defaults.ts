import { supabase } from "@/integrations/supabase/client";

/**
 * Smart defaults — appen kommer ihåg vad du brukar göra.
 * Lagras i public.user_defaults (key → jsonb value).
 */

export type DefaultKey =
  | "shift.last"               // { from, to, breakMinutes, workProfileId }
  | "shift.topPattern"         // { from, to, count }
  | "expense.lastCategory"     // { category }
  | "reminder.lastTime"        // { time }
  | "absence.lastKind";        // { kind }

export async function getDefault<T = any>(key: DefaultKey): Promise<T | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("user_defaults")
    .select("value")
    .eq("user_id", user.id)
    .eq("key", key)
    .maybeSingle();
  return (data?.value as T) ?? null;
}

export async function setDefault(key: DefaultKey, value: any, confidence = 1) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("user_defaults").upsert(
    { user_id: user.id, key, value, confidence },
    { onConflict: "user_id,key" }
  );
}

/** Lär från ett sparat pass — uppdaterar "shift.last" och räknar mönster. */
export async function learnFromShift(input: {
  from: string;       // "HH:MM"
  to: string;         // "HH:MM"
  breakMinutes: number;
  workProfileId?: string | null;
}) {
  await setDefault("shift.last", input);
  // top pattern: tally by from-to
  const key = `${input.from}-${input.to}`;
  const prev = (await getDefault<{ counts: Record<string, number> }>("shift.topPattern")) ?? { counts: {} };
  prev.counts = prev.counts ?? {};
  prev.counts[key] = (prev.counts[key] ?? 0) + 1;
  await setDefault("shift.topPattern", prev);
}

/** Hämtar de vanligaste pass-mallarna (top 3 från historik). */
export async function getTopShiftPatterns(): Promise<Array<{ from: string; to: string; count: number }>> {
  const data = await getDefault<{ counts: Record<string, number> }>("shift.topPattern");
  if (!data?.counts) return [];
  return Object.entries(data.counts)
    .map(([k, count]) => { const [from, to] = k.split("-"); return { from, to, count }; })
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
}
