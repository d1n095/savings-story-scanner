import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { calculateShift, DEFAULT_OB_RULES, type OBRule } from "@/modules/salary/ob";
import { sek, sekPrecise, sweDate, sweTime } from "@/lib/format";
import { Plus, Trash2, Clock, Calculator, X, Repeat, CalendarDays } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/jobb")({ component: JobbPage });

function todayStr(offsetDays = 0) {
  const d = new Date(); d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function addDaysStr(s: string, days: number) {
  const d = new Date(`${s}T00:00:00`); d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function JobbPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const shifts = useQuery({
    queryKey: ["shifts", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("shifts").select("*").order("starts_at", { ascending: false }).limit(50);
      if (error) throw error; return data ?? [];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("shifts").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["shifts"] }); toast.success("Pass borttaget"); },
  });

  const summary = useMemo(() => {
    const now = new Date(); const ms = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const monthShifts = (shifts.data ?? []).filter((s: any) => new Date(s.starts_at).getTime() >= ms);
    const hours = monthShifts.reduce((sum, s: any) => {
      const h = (new Date(s.ends_at).getTime() - new Date(s.starts_at).getTime()) / 3600000 - (s.break_minutes ?? 0) / 60;
      return sum + h;
    }, 0);
    const base = monthShifts.reduce((s, r: any) => s + Number(r.base_amount || 0), 0);
    const ob = monthShifts.reduce((s, r: any) => s + Number(r.ob_amount || 0), 0);
    const total = base + ob;
    const taxRate = Number(profile.data?.tax_rate ?? 30) / 100;
    const net = total * (1 - taxRate);
    return { hours, base, ob, total, net, count: monthShifts.length };
  }, [shifts.data, profile.data]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Jobb & lön</div>
          <h1 className="display text-4xl">Ditt schema</h1>
          <p className="mt-1 text-sm text-muted-foreground">Lägg in ett eller flera pass — vi räknar OB, rast och netto åt dig.</p>
        </div>
        <button onClick={() => setShowForm(v => !v)} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-[oklch(0.88_0.1_85)] to-[oklch(0.7_0.12_75)] px-5 py-2.5 text-sm font-semibold text-background shadow-[0_10px_30px_-10px_oklch(0.78_0.105_85/0.5)]">
          <Plus className="h-4 w-4" /> Nytt pass
        </button>
      </header>

      <section className="grid gap-4 sm:grid-cols-4">
        <Stat label="Timmar" value={summary.hours.toFixed(1)} sub={`${summary.count} pass`} />
        <Stat label="Grundlön" value={sek(summary.base)} />
        <Stat label="OB-tillägg" value={sek(summary.ob)} accent />
        <Stat label="Netto (est.)" value={sek(summary.net)} sub={`Efter ${profile.data?.tax_rate ?? 30}% skatt`} />
      </section>

      {showForm && (
        <ShiftForm
          defaultRate={Number(profile.data?.hourly_rate ?? 0)}
          obRules={(profile.data?.ob_rules as OBRule[] | null)?.length ? (profile.data!.ob_rules as OBRule[]) : DEFAULT_OB_RULES}
          onSavedAll={() => { setShowForm(false); qc.invalidateQueries({ queryKey: ["shifts"] }); }}
          onSavedKeepOpen={() => { qc.invalidateQueries({ queryKey: ["shifts"] }); }}
        />
      )}

      <section className="glass rounded-3xl p-6">
        <h2 className="display text-xl">Senaste pass</h2>
        {shifts.isLoading ? (
          <div className="mt-4 h-24 animate-pulse rounded-xl bg-white/[0.03]" />
        ) : (shifts.data ?? []).length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Inga pass än. Tryck "Nytt pass" ovan.
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {shifts.data!.map((s: any) => (
              <li key={s.id} className="flex items-center gap-4 py-3">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/[0.04]">
                  <Clock className="h-5 w-5 text-[oklch(0.85_0.12_85)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{s.title || "Arbetspass"}{s.is_extra && <span className="ml-2 rounded-full bg-[oklch(0.78_0.105_85/0.15)] px-2 py-0.5 text-[10px] text-[oklch(0.85_0.12_85)]">Extra</span>}</div>
                  <div className="text-xs text-muted-foreground">{sweDate(s.starts_at)} · {sweTime(s.starts_at)}–{sweTime(s.ends_at)} · rast {s.break_minutes}min</div>
                </div>
                <div className="text-right">
                  <div className="num gold-text">{sek(Number(s.total_amount || 0))}</div>
                  <div className="text-[10px] text-muted-foreground">grund {sek(Number(s.base_amount || 0))} + OB {sek(Number(s.ob_amount || 0))}</div>
                </div>
                <button onClick={() => del.mutate(s.id)} className="ml-2 grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-white/[0.05] hover:text-[oklch(0.7_0.12_28)]">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`num mt-2 text-3xl ${accent ? "gold-text" : ""}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

const WEEKDAYS = [
  { i: 1, label: "Mån" }, { i: 2, label: "Tis" }, { i: 3, label: "Ons" },
  { i: 4, label: "Tor" }, { i: 5, label: "Fre" }, { i: 6, label: "Lör" }, { i: 0, label: "Sön" },
];

function ShiftForm({ defaultRate, obRules, onSavedAll, onSavedKeepOpen }: {
  defaultRate: number; obRules: OBRule[];
  onSavedAll: () => void; onSavedKeepOpen: () => void;
}) {
  const [title, setTitle] = useState("");
  const [dates, setDates] = useState<string[]>([todayStr()]);
  const [newDate, setNewDate] = useState(todayStr(1));
  const [from, setFrom] = useState("08:00");
  const [to, setTo] = useState("16:00");
  const [breakMin, setBreakMin] = useState(30);
  const [rate, setRate] = useState(defaultRate || 180);
  const [isExtra, setIsExtra] = useState(false);
  const [saving, setSaving] = useState(false);

  // Veckomönster
  const [patternOpen, setPatternOpen] = useState(false);
  const [patternDays, setPatternDays] = useState<number[]>([]);
  const [patternStart, setPatternStart] = useState(todayStr());
  const [patternWeeks, setPatternWeeks] = useState(2);

  function addDate(d: string) {
    if (!d) return;
    setDates(prev => prev.includes(d) ? prev : [...prev, d].sort());
  }
  function removeDate(d: string) {
    setDates(prev => prev.filter(x => x !== d));
  }
  function applyPattern() {
    if (patternDays.length === 0) { toast.error("Välj minst en veckodag"); return; }
    const out: string[] = [];
    for (let w = 0; w < patternWeeks; w++) {
      for (let day = 0; day < 7; day++) {
        const ds = addDaysStr(patternStart, w * 7 + day);
        const wd = new Date(`${ds}T00:00:00`).getDay();
        if (patternDays.includes(wd)) out.push(ds);
      }
    }
    setDates(prev => Array.from(new Set([...prev, ...out])).sort());
    setPatternOpen(false);
    toast.success(`${out.length} datum tillagda`);
  }

  const previewOne = useMemo(() => {
    if (dates.length === 0) return null;
    try {
      const startsAt = new Date(`${dates[0]}T${from}:00`);
      let endsAt = new Date(`${dates[0]}T${to}:00`);
      if (endsAt <= startsAt) endsAt = new Date(endsAt.getTime() + 86400000);
      return calculateShift({ startsAt, endsAt, breakMinutes: breakMin, hourlyRate: rate, obRules });
    } catch { return null; }
  }, [dates, from, to, breakMin, rate, obRules]);

  // Summering per datum (varierar pga helg/röd dag/natt)
  const previewAll = useMemo(() => {
    let total = 0, ob = 0, hours = 0;
    const perDate: Array<{ date: string; total: number; ob: number }> = [];
    for (const d of dates) {
      try {
        const startsAt = new Date(`${d}T${from}:00`);
        let endsAt = new Date(`${d}T${to}:00`);
        if (endsAt <= startsAt) endsAt = new Date(endsAt.getTime() + 86400000);
        const c = calculateShift({ startsAt, endsAt, breakMinutes: breakMin, hourlyRate: rate, obRules });
        total += c.totalAmount; ob += c.obAmount; hours += c.hours;
        perDate.push({ date: d, total: c.totalAmount, ob: c.obAmount });
      } catch {}
    }
    return { total, ob, hours, perDate };
  }, [dates, from, to, breakMin, rate, obRules]);

  async function saveAll(closeAfter: boolean) {
    if (dates.length === 0) { toast.error("Lägg till minst ett datum"); return; }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Inte inloggad");

      const shiftRows: any[] = [];
      const timelineRows: any[] = [];

      for (const d of dates) {
        const startsAt = new Date(`${d}T${from}:00`);
        let endsAt = new Date(`${d}T${to}:00`);
        if (endsAt <= startsAt) endsAt = new Date(endsAt.getTime() + 86400000);
        const calc = calculateShift({ startsAt, endsAt, breakMinutes: breakMin, hourlyRate: rate, obRules });
        shiftRows.push({
          user_id: user.id, title: title || null,
          starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString(),
          break_minutes: breakMin, hourly_rate: rate,
          base_amount: calc.baseAmount, ob_amount: calc.obAmount, total_amount: calc.totalAmount,
          is_extra: isExtra,
        });
      }

      const { data: inserted, error } = await supabase.from("shifts").insert(shiftRows).select();
      if (error) throw error;

      for (const s of inserted ?? []) {
        const startsAt = new Date(s.starts_at); const endsAt = new Date(s.ends_at);
        const calc = calculateShift({ startsAt, endsAt, breakMinutes: s.break_minutes, hourlyRate: Number(s.hourly_rate), obRules });
        timelineRows.push({
          user_id: user.id, kind: "shift", title: s.title || "Arbetspass",
          subtitle: `${calc.hours.toFixed(1)}h · ${sek(Number(s.total_amount))}`,
          occurs_at: s.starts_at, ends_at: s.ends_at,
          amount: Number(s.total_amount), source_table: "shifts", source_id: s.id,
          metadata: { breakdown: calc.breakdown },
        });
      }
      if (timelineRows.length) await supabase.from("timeline_events").insert(timelineRows);

      toast.success(`${shiftRows.length} pass sparade`);
      if (closeAfter) {
        onSavedAll();
      } else {
        // Reset för snabb inmatning, behåll tider/lön
        const last = dates[dates.length - 1];
        setDates([addDaysStr(last, 1)]);
        setNewDate(addDaysStr(last, 2));
        setTitle("");
        onSavedKeepOpen();
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally { setSaving(false); }
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); saveAll(true); }} className="glass rounded-3xl p-6">
      <div className="mb-5 flex items-center gap-2">
        <Calculator className="h-5 w-5 text-[oklch(0.85_0.12_85)]" />
        <h2 className="display text-xl">Nya pass</h2>
        <span className="ml-2 rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{dates.length} datum</span>
      </div>

      {/* Datum-chips */}
      <div className="mb-5">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Datum</span>
          <button type="button" onClick={() => setPatternOpen(v => !v)} className="inline-flex items-center gap-1 text-xs text-[oklch(0.85_0.12_85)] hover:underline">
            <Repeat className="h-3.5 w-3.5" /> Veckomönster
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 rounded-xl border border-border bg-white/[0.02] p-2">
          {dates.map(d => (
            <span key={d} className="inline-flex items-center gap-1 rounded-full bg-[oklch(0.78_0.105_85/0.12)] px-2.5 py-1 text-xs text-[oklch(0.92_0.08_85)]">
              {sweDate(d)}
              <button type="button" onClick={() => removeDate(d)} className="grid h-4 w-4 place-items-center rounded-full hover:bg-white/[0.08]"><X className="h-3 w-3" /></button>
            </span>
          ))}
          <div className="ml-auto flex items-center gap-1">
            <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="rounded-lg border border-border bg-transparent px-2 py-1 text-xs" />
            <button type="button" onClick={() => { addDate(newDate); setNewDate(addDaysStr(newDate, 1)); }} className="grid h-7 w-7 place-items-center rounded-lg bg-[oklch(0.78_0.105_85/0.2)] text-[oklch(0.92_0.08_85)] hover:bg-[oklch(0.78_0.105_85/0.3)]"><Plus className="h-3.5 w-3.5" /></button>
          </div>
        </div>

        {patternOpen && (
          <div className="mt-2 rounded-xl border border-border bg-white/[0.02] p-3">
            <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" /> Lägg till samma pass på flera veckodagar
            </div>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAYS.map(w => {
                const on = patternDays.includes(w.i);
                return (
                  <button key={w.i} type="button"
                    onClick={() => setPatternDays(prev => on ? prev.filter(x => x !== w.i) : [...prev, w.i])}
                    className={`rounded-full px-3 py-1 text-xs ${on ? "bg-[oklch(0.78_0.105_85)] text-background" : "border border-border text-muted-foreground hover:text-foreground"}`}>
                    {w.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <label className="block">
                <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Från</span>
                <input type="date" value={patternStart} onChange={e => setPatternStart(e.target.value)} className="inp" />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Antal veckor</span>
                <input type="number" min={1} max={26} value={patternWeeks} onChange={e => setPatternWeeks(+e.target.value)} className="inp" />
              </label>
              <div className="flex items-end">
                <button type="button" onClick={applyPattern} className="w-full rounded-lg bg-[oklch(0.78_0.105_85)] px-3 py-2 text-xs font-semibold text-background">Lägg till datum</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Titel (valfri, gäller alla)"><input value={title} onChange={e => setTitle(e.target.value)} className="inp" placeholder="t.ex. Kvällspass" /></Field>
        <Field label="Timlön (kr)"><input type="number" min={0} value={rate} onChange={e => setRate(+e.target.value)} className="inp" /></Field>
        <Field label="Rast (min)"><input type="number" min={0} value={breakMin} onChange={e => setBreakMin(+e.target.value)} className="inp" /></Field>
        <Field label="Från"><input type="time" value={from} onChange={e => setFrom(e.target.value)} className="inp" /></Field>
        <Field label="Till"><input type="time" value={to} onChange={e => setTo(e.target.value)} className="inp" /></Field>
        <label className="flex items-end gap-2 text-sm">
          <input type="checkbox" checked={isExtra} onChange={e => setIsExtra(e.target.checked)} className="h-4 w-4 accent-[oklch(0.78_0.105_85)]" />
          Extrapass
        </label>
      </div>

      {previewOne && dates.length > 0 && (
        <div className="mt-5 rounded-2xl border border-[oklch(0.78_0.105_85/0.25)] bg-[oklch(0.78_0.105_85/0.05)] p-5">
          <div className="flex items-center justify-between">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Totalt över {dates.length} pass</div>
            <div className="text-[10px] text-muted-foreground">OB varierar per dag (helg/röd/natt)</div>
          </div>
          <div className="mt-2 grid gap-3 sm:grid-cols-4">
            <div><div className="text-xs text-muted-foreground">Timmar</div><div className="num text-xl">{previewAll.hours.toFixed(1)}</div></div>
            <div><div className="text-xs text-muted-foreground">Grund/pass</div><div className="num text-xl">{sekPrecise(previewOne.baseAmount)}</div></div>
            <div><div className="text-xs text-muted-foreground">OB totalt</div><div className="num text-xl text-[oklch(0.85_0.12_85)]">{sekPrecise(previewAll.ob)}</div></div>
            <div><div className="text-xs text-muted-foreground">Totalt</div><div className="num gold-text text-2xl">{sekPrecise(previewAll.total)}</div></div>
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button type="button" disabled={saving || dates.length === 0} onClick={() => saveAll(false)} className="rounded-full border border-[oklch(0.78_0.105_85/0.4)] px-5 py-2 text-sm font-semibold text-[oklch(0.92_0.08_85)] hover:bg-[oklch(0.78_0.105_85/0.1)] disabled:opacity-50">
          Spara & lägg till nytt
        </button>
        <button type="submit" disabled={saving || dates.length === 0} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          {saving ? "Sparar..." : `Spara ${dates.length} pass`}
        </button>
      </div>

      <style>{`.inp { width:100%; background:transparent; outline:none; border:1px solid var(--color-border); padding:0.625rem 0.75rem; border-radius:0.75rem; font-size:0.875rem; }`}</style>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
