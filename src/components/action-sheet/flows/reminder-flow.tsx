import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { getDefault, setDefault } from "@/lib/defaults";

export function ReminderFlow({ defaultDate, onDone }: { defaultDate?: string; onDone: () => void }) {
  const qc = useQueryClient();
  const today = defaultDate ?? new Date().toISOString().slice(0, 10);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("09:00");

  useEffect(() => {
    getDefault<{ time: string }>("reminder.lastTime").then((d) => { if (d?.time) setTime(d.time); });
  }, []);

  const save = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Ej inloggad");
      if (!title.trim()) throw new Error("Skriv vad det gäller");
      const { error } = await supabase.from("reminders").insert({
        user_id: user.id, title: title.trim(),
        remind_at: new Date(`${date}T${time}:00`).toISOString(),
      });
      if (error) throw error;
      await setDefault("reminder.lastTime", { time });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cal-reminders"] });
      toast.success("Påminnelse skapad");
      onDone();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-5">
      <div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Vad ska du komma ihåg?</div>
        <input
          autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="T.ex. Betala hyran"
          className="mt-2 w-full bg-transparent text-lg outline-none placeholder:text-muted-foreground/40"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-muted-foreground">Datum
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-sm" />
        </label>
        <label className="text-xs text-muted-foreground">Tid
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-sm" />
        </label>
      </div>
      <button type="submit" disabled={save.isPending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[oklch(0.88_0.1_85)] to-[oklch(0.7_0.12_75)] py-3 text-sm font-medium text-background disabled:opacity-50">
        <Check className="h-4 w-4" /> Skapa påminnelse
      </button>
    </form>
  );
}
