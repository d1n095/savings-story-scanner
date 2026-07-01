import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Briefcase, Check } from "lucide-react";
import { getDefault, getTopShiftPatterns, learnFromShift } from "@/lib/defaults";
import { cn } from "@/lib/utils";

type Preset = { label: string; from: string; to: string; badge?: string };

const FALLBACK_PRESETS: Preset[] = [
  { label: "Dagpass", from: "07:00", to: "16:00", badge: "07–16" },
  { label: "Kvällspass", from: "14:00", to: "22:00", badge: "14–22" },
  { label: "Nattpass", from: "22:00", to: "06:00", badge: "22–06" },
];

export function ShiftFlow({ defaultDate, onDone }: { defaultDate?: string; onDone: () => void }) {
  const qc = useQueryClient();
  const [date, setDate] = useState(defaultDate ?? new Date().toISOString().slice(0, 10));
  const [presets, setPresets] = useState<Preset[]>(FALLBACK_PRESETS);
  const [custom, setCustom] = useState<{ from: string; to: string } | null>(null);
  const [breakMinutes, setBreakMinutes] = useState(30);

  // Hämta arbetsprofiler + smart defaults
  const profiles = useQuery({
    queryKey: ["wp-active"],
    queryFn: async () => {
      const { data } = await supabase.from("work_profiles").select("*").order("is_default", { ascending: false });
      return data ?? [];
    },
  });
  const defaultProfile = profiles.data?.find((p: any) => p.is_default) ?? profiles.data?.[0];

  useEffect(() => {
    (async () => {
      const [last, top] = await Promise.all([
        getDefault<{ from: string; to: string; breakMinutes: number }>("shift.last"),
        getTopShiftPatterns(),
      ]);
      if (last?.breakMinutes !== undefined) setBreakMinutes(last.breakMinutes);

      const learned: Preset[] = top.map((p) => ({
        label: presetName(p.from, p.to),
        from: p.from, to: p.to,
        badge: `${p.from.replace(":", "")}–${p.to.replace(":", "")}`,
      }));
      if (last) {
        const exists = learned.some((p) => p.from === last.from && p.to === last.to);
        if (!exists) learned.unshift({ label: "Senaste", from: last.from, to: last.to, badge: `${last.from}–${last.to}` });
      }
      const merged = [...learned, ...FALLBACK_PRESETS].slice(0, 4);
      // dedupe
      const seen = new Set<string>();
      setPresets(merged.filter((p) => {
        const k = `${p.from}-${p.to}`;
        if (seen.has(k)) return false;
        seen.add(k); return true;
      }));
    })();
  }, []);

  const save = useMutation({
    mutationFn: async (input: { from: string; to: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Ej inloggad");
      const startsAt = new Date(`${date}T${input.from}:00`);
      let endsAt = new Date(`${date}T${input.to}:00`);
      if (endsAt <= startsAt) endsAt = new Date(endsAt.getTime() + 86400000); // nattpass
      const { error } = await supabase.from("shifts").insert({
        user_id: user.id,
        work_profile_id: defaultProfile?.id ?? null,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        break_minutes: breakMinutes,
        hourly_rate: defaultProfile?.hourly_rate ?? null,
      });
      if (error) throw error;
      await learnFromShift({
        from: input.from, to: input.to,
        breakMinutes,
        workProfileId: defaultProfile?.id ?? null,
      });
      return { from: input.from, to: input.to };
    },
    onSuccess: async (saved) => {
      qc.invalidateQueries({ queryKey: ["shifts"] });
      qc.invalidateQueries({ queryKey: ["cal-shifts"] });
      toast.success("Pass sparat");
      // Mönster-nudge: föreslå standard vid 3:e förekomst
      if (saved) {
        const top = await getTopShiftPatterns();
        const match = top.find((p) => p.from === saved.from && p.to === saved.to);
        if (match && match.count === 3) {
          toast(`Du har lagt ${saved.from}–${saved.to} tre gånger`, {
            description: "Vill du göra detta till standardpass?",
            action: { label: "Ja, spara", onClick: () => toast.success("Sparat som standard") },
            duration: 8000,
          });
        }
      }
      onDone();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      {/* Datum + profil — minimalt */}
      <div className="flex items-center justify-between gap-3 text-sm">
        <input
          type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-border bg-background/50 px-3 py-2"
        />
        {defaultProfile && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white/[0.03] px-3 py-1 text-xs text-muted-foreground">
            <Briefcase className="h-3 w-3" /> {defaultProfile.name}
          </span>
        )}
      </div>

      {/* Pass-mallar = ett tryck = klart */}
      <div className="space-y-2">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Vilket pass?</div>
        <div className="grid grid-cols-2 gap-2">
          {presets.map((p, i) => (
            <button
              key={i}
              type="button"
              disabled={save.isPending}
              onClick={() => save.mutate({ from: p.from, to: p.to })}
              className={cn(
                "group flex items-center justify-between rounded-2xl border border-border bg-white/[0.02] px-4 py-4 text-left transition",
                "hover:border-[oklch(0.78_0.105_85/0.5)] hover:bg-[oklch(0.78_0.105_85/0.08)]",
                i === 0 && "border-[oklch(0.78_0.105_85/0.4)] bg-[oklch(0.78_0.105_85/0.06)]",
              )}
            >
              <div>
                <div className="text-sm font-medium">{p.label}</div>
                <div className="text-xs text-muted-foreground">{p.badge}</div>
              </div>
              {i === 0 && <span className="text-[10px] uppercase tracking-wider text-[oklch(0.85_0.12_85)]">Standard</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Egen tid — gömt bakom en länk */}
      {!custom ? (
        <button
          type="button"
          onClick={() => setCustom({ from: "09:00", to: "17:00" })}
          className="text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          Egen tid…
        </button>
      ) : (
        <div className="space-y-2 rounded-2xl border border-border bg-white/[0.02] p-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-muted-foreground">Från
              <input type="time" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })}
                className="mt-1 w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-sm" />
            </label>
            <label className="text-xs text-muted-foreground">Till
              <input type="time" value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })}
                className="mt-1 w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-sm" />
            </label>
          </div>
          <label className="block text-xs text-muted-foreground">Rast (minuter)
            <input type="number" value={breakMinutes} onChange={(e) => setBreakMinutes(Math.max(0, Number(e.target.value) || 0))}
              className="mt-1 w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-sm" />
          </label>
          <button
            type="button"
            disabled={save.isPending}
            onClick={() => save.mutate({ from: custom.from, to: custom.to })}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[oklch(0.88_0.1_85)] to-[oklch(0.7_0.12_75)] py-2.5 text-sm font-medium text-background"
          >
            <Check className="h-4 w-4" /> Spara
          </button>
        </div>
      )}
    </div>
  );
}

function presetName(from: string, to: string) {
  const h = Number(from.slice(0, 2));
  if (h < 10) return "Dagpass";
  if (h < 16) return "Mellanpass";
  if (h < 22) return "Kvällspass";
  return "Nattpass";
}
