import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { calculateShift, DEFAULT_OB_RULES, type OBRule } from "@/modules/salary/ob";
import { sek, sekPrecise, sweDate, sweTime } from "@/lib/format";
import { Plus, Trash2, Clock, Calculator } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/jobb")({ component: JobbPage });

function todayStr(offsetDays = 0) {
  const d = new Date(); d.setDate(d.getDate() + offsetDays);
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
          <p className="mt-1 text-sm text-muted-foreground">Lägg in pass — vi räknar OB, rast och netto åt dig.</p>
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
          onSaved={() => { setShowForm(false); qc.invalidateQueries({ queryKey: ["shifts"] }); }}
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

function ShiftForm({ defaultRate, obRules, onSaved }: { defaultRate: number; obRules: OBRule[]; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayStr());
  const [from, setFrom] = useState("08:00");
  const [to, setTo] = useState("16:00");
  const [breakMin, setBreakMin] = useState(30);
  const [rate, setRate] = useState(defaultRate || 180);
  const [isExtra, setIsExtra] = useState(false);
  const [saving, setSaving] = useState(false);

  const preview = useMemo(() => {
    try {
      const startsAt = new Date(`${date}T${from}:00`);
      let endsAt = new Date(`${date}T${to}:00`);
      if (endsAt <= startsAt) endsAt = new Date(endsAt.getTime() + 86400000); // över midnatt
      return calculateShift({ startsAt, endsAt, breakMinutes: breakMin, hourlyRate: rate, obRules });
    } catch { return null; }
  }, [date, from, to, breakMin, rate, obRules]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Inte inloggad");
      const startsAt = new Date(`${date}T${from}:00`);
      let endsAt = new Date(`${date}T${to}:00`);
      if (endsAt <= startsAt) endsAt = new Date(endsAt.getTime() + 86400000);
      const calc = calculateShift({ startsAt, endsAt, breakMinutes: breakMin, hourlyRate: rate, obRules });
      const { data: shift, error } = await supabase.from("shifts").insert({
        user_id: user.id, title: title || null, starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString(),
        break_minutes: breakMin, hourly_rate: rate, base_amount: calc.baseAmount, ob_amount: calc.obAmount, total_amount: calc.totalAmount, is_extra: isExtra,
      }).select().single();
      if (error) throw error;
      // Skriv till timeline
      await supabase.from("timeline_events").insert({
        user_id: user.id, kind: "shift", title: title || "Arbetspass",
        subtitle: `${calc.hours.toFixed(1)}h · ${sek(calc.totalAmount)}`,
        occurs_at: startsAt.toISOString(), ends_at: endsAt.toISOString(),
        amount: calc.totalAmount, source_table: "shifts", source_id: shift.id,
        metadata: { breakdown: calc.breakdown },
      });
      toast.success("Pass sparat");
      onSaved();
    } catch (err: any) {
      toast.error(err.message);
    } finally { setSaving(false); }
  }

  return (
    <form onSubmit={save} className="glass rounded-3xl p-6">
      <div className="mb-5 flex items-center gap-2">
        <Calculator className="h-5 w-5 text-[oklch(0.85_0.12_85)]" />
        <h2 className="display text-xl">Nytt pass</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Titel (valfri)"><input value={title} onChange={e => setTitle(e.target.value)} className="inp" placeholder="t.ex. Kvällspass" /></Field>
        <Field label="Datum"><input type="date" value={date} onChange={e => setDate(e.target.value)} className="inp" /></Field>
        <Field label="Timlön (kr)"><input type="number" min={0} value={rate} onChange={e => setRate(+e.target.value)} className="inp" /></Field>
        <Field label="Från"><input type="time" value={from} onChange={e => setFrom(e.target.value)} className="inp" /></Field>
        <Field label="Till"><input type="time" value={to} onChange={e => setTo(e.target.value)} className="inp" /></Field>
        <Field label="Rast (min)"><input type="number" min={0} value={breakMin} onChange={e => setBreakMin(+e.target.value)} className="inp" /></Field>
      </div>
      <label className="mt-4 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isExtra} onChange={e => setIsExtra(e.target.checked)} className="h-4 w-4 accent-[oklch(0.78_0.105_85)]" />
        Extrapass (utanför ordinarie schema)
      </label>

      {preview && (
        <div className="mt-5 rounded-2xl border border-[oklch(0.78_0.105_85/0.25)] bg-[oklch(0.78_0.105_85/0.05)] p-5">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Förhandsberäkning</div>
          <div className="mt-2 grid gap-3 sm:grid-cols-4">
            <div><div className="text-xs text-muted-foreground">Timmar</div><div className="num text-xl">{preview.hours.toFixed(2)}</div></div>
            <div><div className="text-xs text-muted-foreground">Grund</div><div className="num text-xl">{sekPrecise(preview.baseAmount)}</div></div>
            <div><div className="text-xs text-muted-foreground">OB</div><div className="num text-xl text-[oklch(0.85_0.12_85)]">{sekPrecise(preview.obAmount)}</div></div>
            <div><div className="text-xs text-muted-foreground">Totalt</div><div className="num gold-text text-2xl">{sekPrecise(preview.totalAmount)}</div></div>
          </div>
          {preview.breakdown.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
              {preview.breakdown.map((b, i) => (
                <li key={i}>· {b.rule}: {(b.minutes/60).toFixed(2)}h → +{sekPrecise(b.amount)}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button disabled={saving} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          {saving ? "Sparar..." : "Spara pass"}
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
