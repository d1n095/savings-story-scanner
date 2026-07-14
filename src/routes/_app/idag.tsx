import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sek } from "@/lib/format";
import {
  Briefcase, Wallet, Bell, Plus, Calendar as CalendarIcon,
  AlertTriangle, Sparkles, ArrowRight, Upload, Settings, Calculator,
  Clock, MapPin, TrendingUp, ChevronRight,
} from "lucide-react";
import { QuickActionsBar } from "@/components/quick-actions-bar";
import { computeShiftAmounts, type ShiftType } from "@/modules/salary/compute";
import { net } from "@/modules/planning/tax";

export const Route = createFileRoute("/_app/idag")({ component: HomePage });

// ---------- helpers ----------
const WEEKDAYS = ["söndag","måndag","tisdag","onsdag","torsdag","fredag","lördag"];
const MONTHS = ["januari","februari","mars","april","maj","juni","juli","augusti","september","oktober","november","december"];

function isoLocal(d: Date) {
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,"0"), day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
function hhmm(ts: string | Date) {
  const d = typeof ts === "string" ? new Date(ts) : ts;
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}
function greet(h: number) {
  if (h < 5) return "God natt";
  if (h < 10) return "God morgon";
  if (h < 13) return "God förmiddag";
  if (h < 17) return "God eftermiddag";
  if (h < 22) return "God kväll";
  return "God natt";
}
function startOfWeek(d: Date) {
  const x = new Date(d); const day = (x.getDay() + 6) % 7; // mon=0
  x.setHours(0,0,0,0); x.setDate(x.getDate() - day); return x;
}
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function nextPayday(from: Date, payDay = 25) {
  const d = new Date(from.getFullYear(), from.getMonth(), payDay);
  if (d <= from) d.setMonth(d.getMonth() + 1);
  // hoppa till fredag om helg
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
  return d;
}

// ---------- page ----------
function HomePage() {
  const now = useMemo(() => new Date(), []);
  const todayStart = useMemo(() => { const d = new Date(now); d.setHours(0,0,0,0); return d; }, [now]);
  const tomorrowStart = useMemo(() => addDays(todayStart, 1), [todayStart]);
  const dayAfter = useMemo(() => addDays(todayStart, 2), [todayStart]);
  const weekStart = useMemo(() => startOfWeek(todayStart), [todayStart]);
  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart]);
  const monthStart = useMemo(() => new Date(now.getFullYear(), now.getMonth(), 1), [now]);
  const monthEnd = useMemo(() => new Date(now.getFullYear(), now.getMonth()+1, 1), [now]);

  const profile = useQuery({
    queryKey: ["profile-home"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      return data as any;
    },
  });

  const workProfile = useQuery({
    queryKey: ["default-work-profile"],
    queryFn: async () => {
      const { data } = await supabase.from("work_profiles")
        .select("*").eq("is_default", true).limit(1).maybeSingle();
      if (data) return data as any;
      const { data: any1 } = await supabase.from("work_profiles").select("*").limit(1).maybeSingle();
      return any1 as any;
    },
  });

  const monthShifts = useQuery({
    queryKey: ["home-shifts-month", monthStart.toISOString()],
    queryFn: async () => {
      const { data } = await supabase.from("shifts").select("*")
        .gte("starts_at", monthStart.toISOString())
        .lt("starts_at", monthEnd.toISOString())
        .order("starts_at");
      return data ?? [];
    },
  });

  const upcoming = useQuery({
    queryKey: ["home-upcoming"],
    queryFn: async () => {
      const { data } = await supabase.from("shifts").select("*")
        .gte("starts_at", todayStart.toISOString())
        .order("starts_at").limit(6);
      return data ?? [];
    },
  });

  const monthExpenses = useQuery({
    queryKey: ["home-expenses-month", monthStart.toISOString()],
    queryFn: async () => {
      const { data } = await supabase.from("expenses").select("*")
        .gte("occurred_at", monthStart.toISOString())
        .lt("occurred_at", monthEnd.toISOString());
      return data ?? [];
    },
  });

  const reminders = useQuery({
    queryKey: ["home-reminders"],
    queryFn: async () => {
      const { data } = await supabase.from("reminders").select("*")
        .gte("remind_at", todayStart.toISOString())
        .order("remind_at").limit(5);
      return data ?? [];
    },
  });

  // derived
  const allShifts = monthShifts.data ?? [];
  const todayShifts = (upcoming.data ?? []).filter((s: any) => {
    const d = new Date(s.starts_at);
    return d >= todayStart && d < tomorrowStart;
  });
  const tomorrowShifts = (upcoming.data ?? []).filter((s: any) => {
    const d = new Date(s.starts_at);
    return d >= tomorrowStart && d < dayAfter;
  });
  const nextShift = (upcoming.data ?? []).find((s: any) => new Date(s.ends_at) > now);

  const weekEarned = allShifts
    .filter((s: any) => { const d = new Date(s.starts_at); return d >= weekStart && d < weekEnd; })
    .reduce((sum: number, s: any) => sum + Number(s.total_amount ?? 0), 0);
  const monthEarned = allShifts.reduce((s: number, r: any) => s + Number(r.total_amount ?? 0), 0);
  const monthSpent = (monthExpenses.data ?? []).reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0);

  const payday = nextPayday(now, 25);
  const daysToPay = Math.ceil((payday.getTime() - now.getTime()) / 86400000);

  const todayPay = todayShifts.reduce((s: number, r: any) => s + Number(r.total_amount ?? 0), 0);
  const nextPay = Number(nextShift?.total_amount ?? 0);

  // warnings
  const warnings = useMemo(() => {
    const out: { key: string; label: string; kind: "error"|"warn"; to?: string }[] = [];
    if (!workProfile.data || !Number(workProfile.data?.hourly_rate)) {
      out.push({ key: "no-rate", label: "Ingen timlön inställd — lön kan inte räknas.", kind: "error", to: "/installningar/lon-arbete" });
    }
    const zeroPay = allShifts.filter((s: any) => !Number(s.total_amount));
    if (zeroPay.length) out.push({ key: "zero", label: `${zeroPay.length} pass i månaden saknar lönebelopp.`, kind: "warn", to: "/jobb" });

    // duplicate detection: same starts_at + ends_at
    const map = new Map<string, number>();
    for (const s of allShifts) {
      const k = `${s.starts_at}|${s.ends_at}`;
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    const dupes = [...map.values()].filter((n) => n > 1).length;
    if (dupes) out.push({ key: "dup", label: `${dupes} möjliga dubblettpass upptäckta.`, kind: "warn", to: "/jobb" });

    if (!workProfile.data?.workplace) out.push({ key: "no-wp", label: "Ingen arbetsplats angiven i profilen.", kind: "warn", to: "/installningar/lon-arbete" });
    return out;
  }, [allShifts, workProfile.data]);

  const workplaceLabel = workProfile.data?.workplace || workProfile.data?.employer || "—";
  const firstName = (profile.data?.display_name || "").split(" ")[0] || "vän";

  return (
    <div className="space-y-6">
      {/* Hälsning */}
      <header className="flex items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {WEEKDAYS[now.getDay()]} · {now.getDate()} {MONTHS[now.getMonth()]} {now.getFullYear()}
          </div>
          <h1 className="display mt-1 text-3xl sm:text-4xl">
            {greet(now.getHours())}, <span className="gold-text">{firstName}</span>.
          </h1>
        </div>
      </header>

      {/* Varningar */}
      {warnings.length > 0 && (
        <div className="rounded-2xl border border-[oklch(0.7_0.12_28/0.3)] bg-[oklch(0.7_0.12_28/0.06)] p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="h-4 w-4 text-[oklch(0.75_0.15_50)]" />
            Behöver uppmärksamhet
          </div>
          <ul className="space-y-1.5">
            {warnings.map((w) => (
              <li key={w.key}>
                {w.to ? (
                  <Link to={w.to} className="group flex items-center justify-between rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-white/[0.04] hover:text-foreground">
                    <span>{w.label}</span>
                    <ChevronRight className="h-3.5 w-3.5 opacity-60 transition group-hover:translate-x-0.5" />
                  </Link>
                ) : (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">{w.label}</div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Nu / Idag hero */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="glass relative overflow-hidden rounded-3xl p-6 lg:col-span-2">
          <div className="absolute -top-16 -right-10 h-56 w-56 rounded-full bg-[radial-gradient(closest-side,oklch(0.78_0.105_85/0.16),transparent)]" />
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Nu · Idag</div>
          {todayShifts.length === 0 ? (
            <div className="mt-3">
              <div className="display text-2xl">Inget arbete planerat idag.</div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to="/jobb" className="rounded-full bg-gradient-to-b from-[oklch(0.88_0.1_85)] to-[oklch(0.7_0.12_75)] px-4 py-2 text-sm font-medium text-background">Lägg till pass</Link>
                <Link to="/importera" className="rounded-full border border-border bg-white/[0.03] px-4 py-2 text-sm hover:bg-white/[0.06]">Importera schema</Link>
              </div>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              {todayShifts.map((s: any) => (
                <ShiftRow key={s.id} s={s} />
              ))}
              <div className="mt-2 flex items-center justify-between border-t border-border pt-3 text-sm">
                <span className="text-muted-foreground">Beräknad lön idag</span>
                <span className="num gold-text text-xl">{sek(todayPay)}</span>
              </div>
            </div>
          )}

          {tomorrowShifts.length > 0 && (
            <div className="mt-5 rounded-2xl border border-border bg-white/[0.02] p-4">
              <div className="mb-2 text-[11px] uppercase tracking-widest text-muted-foreground">Imorgon</div>
              {tomorrowShifts.map((s: any) => <ShiftRow key={s.id} s={s} compact />)}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <MetricCard label="Nästa pass" main={nextShift ? `${WEEKDAYS[new Date(nextShift.starts_at).getDay()].slice(0,3)} ${hhmm(nextShift.starts_at)}` : "—"}
            sub={nextShift ? `${hhmm(nextShift.starts_at)}–${hhmm(nextShift.ends_at)} · ${sek(nextPay)}` : "Inga fler pass inplanerade"}
            icon={<Clock className="h-4 w-4" />} to="/jobb" />
          <MetricCard label="Arbetsplats" main={workplaceLabel}
            sub={workProfile.data ? `${sek(Number(workProfile.data?.hourly_rate ?? 0))}/h` : "Ingen profil"}
            icon={<MapPin className="h-4 w-4" />} to="/installningar/lon-arbete" />
        </div>
      </section>

      {/* Vecka + Månad + Lön */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Denna vecka" value={sek(weekEarned)} sub="intjänat" to="/jobb" />
        <StatTile label="Denna månad" value={sek(monthEarned)} sub={`${allShifts.length} pass`} to="/jobb" />
        <StatTile label="Nästa lön" value={sek(monthEarned)} sub={`utbetalas ${payday.getDate()}/${payday.getMonth()+1}`} to="/pengar" />
        <StatTile label="Kvar till lön" value={`${daysToPay} dgr`} sub={`${payday.getDate()} ${MONTHS[payday.getMonth()].slice(0,3)}`} to="/pengar" />
      </section>

      {/* Snabbhandlingar */}
      <QuickActionsBar defaultDate={isoLocal(todayStart)} />

      {/* Testa lön */}
      <SalaryTester profile={workProfile.data} />

      {/* Snabblänkar */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickLink to="/jobb" icon={<Plus className="h-4 w-4" />} label="Lägg till pass" />
        <QuickLink to="/importera" icon={<Upload className="h-4 w-4" />} label="Importera schema" />
        <QuickLink to="/kalender" icon={<CalendarIcon className="h-4 w-4" />} label="Öppna kalender" />
        <QuickLink to="/installningar/lon-arbete" icon={<Settings className="h-4 w-4" />} label="Arbete & lön" />
      </section>

      {/* Pengar + påminnelser */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="glass rounded-3xl p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Wallet className="h-4 w-4 text-[oklch(0.85_0.12_85)]" /> Pengar denna månad
            </div>
            <Link to="/pengar" className="text-xs text-[oklch(0.85_0.12_85)] hover:underline">Detaljer →</Link>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <MiniStat label="In" value={sek(monthEarned)} tone="gold" />
            <MiniStat label="Ut" value={sek(monthSpent)} tone="coral" />
            <MiniStat label="Netto" value={sek(monthEarned - monthSpent)} tone={monthEarned - monthSpent >= 0 ? "emerald" : "coral"} />
          </div>
        </div>

        <div className="glass rounded-3xl p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Bell className="h-4 w-4 text-[oklch(0.85_0.12_85)]" /> Påminnelser
            </div>
          </div>
          {(reminders.data ?? []).length === 0 ? (
            <div className="text-sm text-muted-foreground">Inga aktiva påminnelser.</div>
          ) : (
            <ul className="divide-y divide-border">
              {(reminders.data ?? []).map((r: any) => (
                <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{r.title}</span>
                  <span className="text-xs text-muted-foreground">{new Date(r.remind_at).toLocaleDateString("sv-SE")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

// ---------- små komponenter ----------
function ShiftRow({ s, compact }: { s: any; compact?: boolean }) {
  const typeLabel = ({
    regular: "Vanligt pass",
    waking_on_call: "Vaken jour",
    sleeping_on_call: "Sovande jour",
    standby: "Beredskap",
  } as const)[s.shift_type as ShiftType] ?? "Pass";
  return (
    <div className={`flex items-center justify-between gap-4 ${compact ? "" : "rounded-xl border border-border bg-white/[0.02] p-3"}`}>
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{s.title || typeLabel}</div>
        <div className="text-xs text-muted-foreground">
          {hhmm(s.starts_at)}–{hhmm(s.ends_at)} · rast {s.break_minutes || 0} min
        </div>
      </div>
      <div className="text-right">
        <div className="num text-base gold-text">{sek(Number(s.total_amount || 0))}</div>
        {Number(s.ob_amount) > 0 && (
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">+ OB {sek(Number(s.ob_amount))}</div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, main, sub, icon, to }: { label: string; main: string; sub: string; icon: React.ReactNode; to: string }) {
  return (
    <Link to={to} className="glass block rounded-3xl p-5 transition hover:translate-y-[-1px]">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-2 truncate display text-xl">{main}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </Link>
  );
}

function StatTile({ label, value, sub, to }: { label: string; value: string; sub: string; to: string }) {
  return (
    <Link to={to} className="glass block rounded-2xl p-4 transition hover:translate-y-[-1px]">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="num mt-1 text-2xl gold-text">{value}</div>
      <div className="text-[11px] text-muted-foreground">{sub}</div>
    </Link>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone: "gold"|"coral"|"emerald" }) {
  const color = tone === "coral" ? "text-[oklch(0.7_0.12_28)]" : tone === "emerald" ? "text-[oklch(0.75_0.1_165)]" : "gold-text";
  return (
    <div className="rounded-xl border border-border bg-white/[0.02] p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`num mt-1 text-base ${color}`}>{value}</div>
    </div>
  );
}

function QuickLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link to={to} className="group flex items-center justify-between rounded-2xl border border-border bg-white/[0.02] px-4 py-3 text-sm transition hover:bg-white/[0.05]">
      <span className="flex items-center gap-2"><span className="text-[oklch(0.85_0.12_85)]">{icon}</span> {label}</span>
      <ArrowRight className="h-4 w-4 opacity-60 transition group-hover:translate-x-0.5" />
    </Link>
  );
}

// ---------- Testa lön ----------
function SalaryTester({ profile }: { profile: any }) {
  const [open, setOpen] = useState(false);
  const today = isoLocal(new Date());
  const [date, setDate] = useState(today);
  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("17:00");
  const [breakMin, setBreakMin] = useState(30);
  const [type, setType] = useState<ShiftType>("regular");
  const [isExtra, setIsExtra] = useState(false);
  const [activeMin, setActiveMin] = useState(0);

  const result = useMemo(() => {
    if (!profile) return null;
    try {
      const startsAt = new Date(`${date}T${start}:00`);
      const endsAtRaw = new Date(`${date}T${end}:00`);
      const endsAt = endsAtRaw <= startsAt ? new Date(endsAtRaw.getTime() + 86400000) : endsAtRaw;
      const r = computeShiftAmounts({
        startsAt, endsAt,
        breakMinutes: Number(breakMin) || 0,
        shiftType: type,
        activeMinutes: Number(activeMin) || 0,
        profile,
      });
      const extraBonus = isExtra ? r.base_amount * 0.5 : 0; // enkel schablon: +50% på grund vid extra
      const gross = r.total_amount + extraBonus;
      const afterTax = net(gross, profile.tax_rate);
      return { ...r, extraBonus, gross, afterTax };
    } catch { return null; }
  }, [date, start, end, breakMin, type, activeMin, isExtra, profile]);

  return (
    <section className="glass rounded-3xl p-5">
      <button onClick={() => setOpen(v => !v)} className="flex w-full items-center justify-between text-left">
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-[oklch(0.85_0.12_85)]" />
          <div>
            <div className="text-sm font-medium">Testa lön</div>
            <div className="text-xs text-muted-foreground">Räkna på ett pass utan att spara.</div>
          </div>
        </div>
        <ChevronRight className={`h-4 w-4 transition ${open ? "rotate-90" : ""}`} />
      </button>

      {open && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <Field label="Datum"><input type="date" value={date} onChange={e => setDate(e.target.value)} className="input" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start"><input type="time" value={start} onChange={e => setStart(e.target.value)} className="input" /></Field>
              <Field label="Slut"><input type="time" value={end} onChange={e => setEnd(e.target.value)} className="input" /></Field>
            </div>
            <Field label="Rast (min)"><input type="number" min={0} value={breakMin} onChange={e => setBreakMin(Number(e.target.value))} className="input" /></Field>
            <Field label="Passtyp">
              <select value={type} onChange={e => setType(e.target.value as ShiftType)} className="input">
                <option value="regular">Vanligt pass</option>
                <option value="waking_on_call">Vaken jour</option>
                <option value="sleeping_on_call">Sovande jour</option>
                <option value="standby">Beredskap</option>
              </select>
            </Field>
            {(type === "sleeping_on_call" || type === "standby") && (
              <Field label="Aktiv tid vid utryckning (min)"><input type="number" min={0} value={activeMin} onChange={e => setActiveMin(Number(e.target.value))} className="input" /></Field>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isExtra} onChange={e => setIsExtra(e.target.checked)} />
              Extra pass (+50% på grundlön)
            </label>
          </div>

          <div className="rounded-2xl border border-border bg-white/[0.02] p-4">
            {!profile ? (
              <div className="text-sm text-muted-foreground">Lägg in timlön i <Link to="/installningar/lon-arbete" className="underline">Arbete & lön</Link> för att räkna.</div>
            ) : result ? (
              <div className="space-y-1.5 text-sm">
                <Row label="Timlön" value={`${sek(result.hourly_rate)}/h`} />
                <Row label="Grundlön" value={sek(result.base_amount)} />
                <Row label="OB-tillägg" value={sek(result.ob_amount)} />
                {result.extraBonus > 0 && <Row label="Extraersättning" value={sek(result.extraBonus)} />}
                {result.active_minutes > 0 && <Row label="Aktiv tid" value={`${result.active_minutes} min`} />}
                {result.break_minutes > 0 && <Row label="Rastavdrag" value={`${result.break_minutes} min`} />}
                <div className="my-2 border-t border-border" />
                <Row label="Bruttolön" value={sek(result.gross)} strong />
                <Row label="Efter skatt (uppskattning)" value={sek(result.afterTax)} strong />
                <div className="mt-3 text-[11px] text-muted-foreground">Detta sparar inget pass. Använd "Lägg till pass" för att spara.</div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Ange giltig tid.</div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .input { width:100%; border-radius:0.75rem; border:1px solid hsl(var(--border, 0 0% 20%)); background:rgba(255,255,255,0.03); padding:0.5rem 0.75rem; font-size:0.875rem; color:inherit; }
        .input:focus { outline: none; border-color: oklch(0.78 0.105 85 / 0.6); }
      `}</style>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] uppercase tracking-widest text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "num gold-text text-base" : ""}>{value}</span>
    </div>
  );
}
