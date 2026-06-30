import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { holidaysForYear } from "@/modules/calendar/holidays";
import { namedaysFor } from "@/modules/calendar/namedays";
import { sek, sweTime } from "@/lib/format";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_app/kalender")({ component: KalenderPage });

const WEEK_LABELS = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"];

function KalenderPage() {
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d; });
  const [selected, setSelected] = useState<Date>(new Date());

  const start = useMemo(() => { const d = new Date(cursor); d.setDate(1); return d; }, [cursor]);
  const end = useMemo(() => { const d = new Date(cursor); d.setMonth(d.getMonth()+1); d.setDate(0); d.setHours(23,59,59,999); return d; }, [cursor]);

  const shifts = useQuery({
    queryKey: ["cal-shifts", start.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase.from("shifts").select("*")
        .gte("starts_at", start.toISOString()).lte("starts_at", end.toISOString())
        .order("starts_at");
      if (error) throw error; return data ?? [];
    },
  });

  const holidays = useMemo(() => holidaysForYear(cursor.getFullYear()), [cursor]);
  const holidayMap = useMemo(() => new Map(holidays.map(h => [h.date, h])), [holidays]);
  const shiftsByDay = useMemo(() => {
    const m = new Map<string, any[]>();
    (shifts.data ?? []).forEach((s: any) => {
      const k = new Date(s.starts_at).toISOString().slice(0,10);
      const arr = m.get(k) ?? []; arr.push(s); m.set(k, arr);
    });
    return m;
  }, [shifts.data]);

  // Build 6×7 grid starting Monday
  const grid: Date[] = useMemo(() => {
    const first = new Date(start);
    const dow = (first.getDay() + 6) % 7; // 0 = Monday
    first.setDate(first.getDate() - dow);
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(first); d.setDate(d.getDate() + i); return d; });
  }, [start]);

  const monthName = cursor.toLocaleDateString("sv-SE", { month: "long", year: "numeric" });
  const selKey = selected.toISOString().slice(0,10);
  const selHoliday = holidayMap.get(selKey);
  const selShifts = shiftsByDay.get(selKey) ?? [];
  const selNames = namedaysFor(selected);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Kalender</div>
          <h1 className="display text-4xl capitalize">{monthName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCursor(d => { const n = new Date(d); n.setMonth(n.getMonth()-1); return n; })}
            className="grid h-10 w-10 place-items-center rounded-full border border-border hover:bg-white/[0.05]">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => { const t = new Date(); t.setDate(1); t.setHours(0,0,0,0); setCursor(t); setSelected(new Date()); }}
            className="rounded-full border border-border px-4 py-2 text-xs hover:bg-white/[0.05]">
            Idag
          </button>
          <button onClick={() => setCursor(d => { const n = new Date(d); n.setMonth(n.getMonth()+1); return n; })}
            className="grid h-10 w-10 place-items-center rounded-full border border-border hover:bg-white/[0.05]">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="glass overflow-hidden rounded-3xl p-4 sm:p-6">
          <div className="mb-3 grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
            {WEEK_LABELS.map(w => <div key={w}>{w}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {grid.map((d) => {
              const key = d.toISOString().slice(0,10);
              const inMonth = d.getMonth() === cursor.getMonth();
              const isToday = key === new Date().toISOString().slice(0,10);
              const isSel = key === selKey;
              const h = holidayMap.get(key);
              const ss = shiftsByDay.get(key) ?? [];
              const isSunday = d.getDay() === 0;
              return (
                <button
                  key={key}
                  onClick={() => setSelected(new Date(d))}
                  className={`group relative aspect-square rounded-xl border p-1.5 text-left transition sm:p-2 ${
                    isSel ? "border-[oklch(0.78_0.105_85/0.6)] bg-[oklch(0.78_0.105_85/0.08)]" :
                    "border-transparent hover:border-border hover:bg-white/[0.03]"
                  } ${!inMonth ? "opacity-30" : ""}`}
                >
                  <div className="flex items-start justify-between">
                    <span className={`num text-sm ${isToday ? "text-[oklch(0.85_0.12_85)]" : (h?.type === "red" || isSunday) ? "text-[oklch(0.7_0.12_28)]" : ""}`}>
                      {d.getDate()}
                    </span>
                    {h?.type === "red" && <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.7_0.12_28)]" />}
                  </div>
                  {h && <div className="mt-1 line-clamp-1 hidden text-[10px] text-muted-foreground sm:block">{h.name}</div>}
                  {ss.length > 0 && (
                    <div className="absolute bottom-1.5 left-1.5 right-1.5 flex gap-0.5">
                      {ss.slice(0,3).map((_, i) => <div key={i} className="h-1 flex-1 rounded-full bg-[oklch(0.85_0.12_85)]" />)}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <aside className="glass rounded-3xl p-6">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
            {selected.toLocaleDateString("sv-SE", { weekday: "long", day: "numeric", month: "long" })}
          </div>
          <h2 className="display mt-1 text-2xl">{selHoliday?.name ?? "Vanlig dag"}</h2>
          <div className="mt-1 text-sm text-muted-foreground">Namnsdag: {selNames.join(", ") || "—"}</div>

          <div className="mt-6">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Pass</div>
            {selShifts.length === 0 ? (
              <div className="mt-2 text-sm text-muted-foreground">Inga pass.</div>
            ) : (
              <ul className="mt-2 space-y-2">
                {selShifts.map((s: any) => (
                  <li key={s.id} className="rounded-xl border border-border bg-white/[0.02] p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{s.title || "Arbetspass"}</div>
                        <div className="text-xs text-muted-foreground">{sweTime(s.starts_at)}–{sweTime(s.ends_at)}</div>
                      </div>
                      <div className="num gold-text">{sek(Number(s.total_amount || 0))}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
