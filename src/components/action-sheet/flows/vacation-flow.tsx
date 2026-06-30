import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { setDefault } from "@/lib/defaults";
import { cn } from "@/lib/utils";

const KINDS = [
  { value: "vacation", label: "Semester", emoji: "🏖" },
  { value: "sick",     label: "Sjuk",     emoji: "🤒" },
  { value: "vab",      label: "VAB",      emoji: "👶" },
  { value: "leave",    label: "Ledigt",   emoji: "☕" },
] as const;

export function AbsenceFlow({
  defaultKind = "vacation",
  defaultDate,
  onDone,
}: {
  defaultKind?: "vacation" | "sick" | "vab" | "leave";
  defaultDate?: string;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const today = defaultDate ?? new Date().toISOString().slice(0, 10);
  const [kind, setKind] = useState<string>(defaultKind);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);

  const save = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Ej inloggad");
      const { error } = await supabase.from("absences").insert({
        user_id: user.id, kind: kind as any,
        starts_on: from, ends_on: to,
        paid: kind === "vacation", status: "planned" as any,
      });
      if (error) throw error;
      await setDefault("absence.lastKind", { kind });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cal-absences"] });
      toast.success("Sparat");
      onDone();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const days = Math.max(1, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1);

  return (
    <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-5">
      <div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Vad gäller det?</div>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {KINDS.map((k) => (
            <button
              key={k.value}
              type="button"
              onClick={() => setKind(k.value)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-xs transition",
                kind === k.value
                  ? "border-[oklch(0.78_0.105_85/0.5)] bg-[oklch(0.78_0.105_85/0.12)]"
                  : "border-border bg-white/[0.02] text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="text-lg">{k.emoji}</span>{k.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">När?</div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="text-xs text-muted-foreground">Från
            <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); if (e.target.value > to) setTo(e.target.value); }}
              className="mt-1 w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-sm" />
          </label>
          <label className="text-xs text-muted-foreground">Till
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} min={from}
              className="mt-1 w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-sm" />
          </label>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">{days} dag{days !== 1 && "ar"}</div>
      </div>

      <button
        type="submit" disabled={save.isPending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[oklch(0.88_0.1_85)] to-[oklch(0.7_0.12_75)] py-3 text-sm font-medium text-background disabled:opacity-50"
      >
        <Check className="h-4 w-4" /> Spara
      </button>
    </form>
  );
}
