import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sek, sweDate, sweTime } from "@/lib/format";
import { calcMoneyScore } from "@/modules/finance/score";
import { holidaysForYear } from "@/modules/calendar/holidays";
import { namedaysFor } from "@/modules/calendar/namedays";
import { Briefcase, Wallet, Calendar as CalIcon, Sparkles, ArrowUpRight, Plus, TrendingUp } from "lucide-react";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

type Profile = { display_name: string | null; hourly_rate: number | null; tax_rate: number | null; monthly_buffer_goal: number | null; onboarded: boolean | null };

function Dashboard() {
  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });

  const shifts = useQuery({
    queryKey: ["shifts", "month"],
    queryFn: async () => {
      const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
      const end = new Date(start); end.setMonth(end.getMonth() + 1);
      const { data, error } = await supabase
        .from("shifts").select("*")
        .gte("starts_at", start.toISOString()).lt("starts_at", end.toISOString())
        .order("starts_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const expenses = useQuery({
    queryKey: ["expenses", "month"],
    queryFn: async () => {
      const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("expenses").select("*")
        .gte("occurred_at", start.toISOString())
        .order("occurred_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const upcomingShifts = useQuery({
    queryKey: ["shifts", "upcoming"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shifts").select("*")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(4);
      if (error) throw error;
      return data ?? [];
    },
  });

  const monthIncome = (shifts.data ?? []).reduce((s, r: any) => s + Number(r.total_amount ?? 0), 0);
  const monthSpend = (expenses.data ?? []).reduce((s, r: any) => s + Number(r.amount ?? 0), 0);
  const recurringSubs = (expenses.data ?? []).filter((e: any) => e.is_recurring).reduce((s, r: any) => s + Number(r.amount), 0);

  const score = useMemo(() => calcMoneyScore({
    monthlyIncome: monthIncome,
    monthlyExpenses: monthSpend,
    recurringSubs,
    bufferMonths: 0,
    daysWithoutImpulse: 0,
    plannedVsActualRatio: 0.5,
  }), [monthIncome, monthSpend, recurringSubs]);

  const today = new Date();
  const holidays = holidaysForYear(today.getFullYear());
  const todaysHoliday = holidays.find(h => h.date === today.toISOString().slice(0, 10));
  const namedaysToday = namedaysFor(today);

  // Onboarding nudge
  useEffect(() => {
    if (profile.data && (profile.data.hourly_rate ?? 0) === 0) {
      toast("Tips: Lägg in din timlön i Inställningar för automatisk löneräkning.", {
        action: { label: "Öppna", onClick: () => location.assign("/installningar") },
      });
    }
  }, [profile.data]);

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <header>
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{sweDate(today)}</div>
        <h1 className="display mt-2 text-4xl sm:text-5xl">
          God dag, <span className="gold-text">{profile.data?.display_name?.split(" ")[0] || "vän"}</span>.
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {todaysHoliday ? `Idag är det ${todaysHoliday.name}. ` : ""}
          Namnsdag: <span className="text-foreground">{namedaysToday.join(", ") || "—"}</span>
        </p>
      </header>

      {/* Hero score */}
      <section className="grid gap-5 lg:grid-cols-3">
        <div className="glass relative col-span-2 overflow-hidden rounded-3xl p-8">
          <div className="absolute -top-20 -right-10 h-64 w-64 rounded-full bg-[radial-gradient(closest-side,oklch(0.78_0.105_85/0.18),transparent)]" />
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Money Score</div>
          <div className="mt-3 flex items-end gap-4">
            <div className="num gold-text text-8xl leading-none">{score.score}</div>
            <div className="pb-2">
              <div className="display text-2xl">Klass {score.letter}</div>
              <div className="text-xs text-muted-foreground">av 100 · uppdateras live</div>
            </div>
          </div>
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            {score.drivers.slice(0, 4).map((d) => (
              <div key={d.label} className="flex items-center justify-between rounded-xl border border-border bg-white/[0.02] px-3 py-2 text-sm">
                <span className="text-muted-foreground">{d.label}</span>
                <span className={d.positive ? "text-[oklch(0.75_0.1_165)]" : "text-[oklch(0.7_0.12_28)]"}>
                  {d.delta > 0 ? "+" : ""}{d.delta}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-3xl p-6">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Denna månad</div>
          <div className="mt-4 space-y-4">
            <Metric icon={<Briefcase className="h-4 w-4" />} label="Intjänat" value={sek(monthIncome)} accent="gold" />
            <Metric icon={<Wallet className="h-4 w-4" />} label="Spenderat" value={sek(monthSpend)} accent="coral" />
            <Metric icon={<TrendingUp className="h-4 w-4" />} label="Netto" value={sek(monthIncome - monthSpend)} accent={monthIncome - monthSpend >= 0 ? "emerald" : "coral"} />
          </div>
          <Link to="/pengar" className="mt-5 inline-flex items-center gap-1 text-xs text-[oklch(0.85_0.12_85)] hover:underline">
            Se detaljer <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </section>

      {/* Timeline + quick actions */}
      <section className="grid gap-5 lg:grid-cols-3">
        <div className="glass col-span-2 rounded-3xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="display text-xl">Kommande pass</h2>
            <Link to="/jobb" className="text-xs text-[oklch(0.85_0.12_85)] hover:underline">Hantera →</Link>
          </div>
          {upcomingShifts.isLoading ? (
            <Skeleton />
          ) : (upcomingShifts.data ?? []).length === 0 ? (
            <EmptyState
              title="Inga inplanerade pass"
              body="Lägg in ditt schema så räknar vi lön och OB automatiskt."
              cta={{ to: "/jobb", label: "Lägg till pass" }}
            />
          ) : (
            <ul className="space-y-2">
              {upcomingShifts.data!.map((s: any) => (
                <li key={s.id} className="flex items-center gap-4 rounded-xl border border-border bg-white/[0.02] p-3">
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-[oklch(0.78_0.105_85/0.18)] to-transparent">
                    <CalIcon className="h-5 w-5 text-[oklch(0.85_0.12_85)]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{s.title || "Arbetspass"}</div>
                    <div className="text-xs text-muted-foreground">
                      {sweDate(s.starts_at)} · {sweTime(s.starts_at)}–{sweTime(s.ends_at)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="num text-base gold-text">{sek(Number(s.total_amount || 0))}</div>
                    {Number(s.ob_amount) > 0 && <div className="text-[10px] uppercase tracking-wider text-muted-foreground">+ OB {sek(Number(s.ob_amount))}</div>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-5">
          <div className="glass rounded-3xl p-6">
            <h3 className="display text-lg">Snabbåtgärder</h3>
            <div className="mt-4 space-y-2">
              <QuickAction to="/jobb" icon={<Plus className="h-4 w-4" />} label="Nytt pass" />
              <QuickAction to="/pengar" icon={<Plus className="h-4 w-4" />} label="Ny utgift" />
              <QuickAction to="/kalender" icon={<CalIcon className="h-4 w-4" />} label="Öppna kalender" />
              <QuickAction to="/insikter" icon={<Sparkles className="h-4 w-4" />} label="Visa insikter" />
            </div>
          </div>

          <div className="glass rounded-3xl p-6">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Nästa röda dag</div>
            <NextHoliday />
          </div>
        </div>
      </section>
    </div>
  );
}

function NextHoliday() {
  const today = new Date(); today.setHours(0,0,0,0);
  const all = [...holidaysForYear(today.getFullYear()), ...holidaysForYear(today.getFullYear() + 1)];
  const next = all.filter(h => h.type === "red").find(h => new Date(h.date) >= today);
  if (!next) return <div className="mt-2 text-sm text-muted-foreground">—</div>;
  const days = Math.ceil((new Date(next.date).getTime() - today.getTime()) / 86400000);
  return (
    <div className="mt-3">
      <div className="display text-xl">{next.name}</div>
      <div className="text-sm text-muted-foreground">{sweDate(next.date)} · om {days} dagar</div>
    </div>
  );
}

function Metric({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: "gold" | "coral" | "emerald" }) {
  const color = accent === "gold" ? "text-[oklch(0.85_0.12_85)]" : accent === "coral" ? "text-[oklch(0.7_0.12_28)]" : "text-[oklch(0.75_0.1_165)]";
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">{icon}{label}</div>
      <div className={`num text-xl ${color}`}>{value}</div>
    </div>
  );
}

function QuickAction({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-xl border border-border bg-white/[0.02] px-3 py-2.5 text-sm transition hover:bg-white/[0.06]">
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-[oklch(0.78_0.105_85/0.15)] text-[oklch(0.85_0.12_85)]">{icon}</span>
      {label}
    </Link>
  );
}

function EmptyState({ title, body, cta }: { title: string; body: string; cta: { to: string; label: string } }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-8 text-center">
      <div className="display text-lg">{title}</div>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      <Link to={cta.to} className="mt-4 inline-flex rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground">{cta.label}</Link>
    </div>
  );
}

function Skeleton() { return <div className="h-32 animate-pulse rounded-xl bg-white/[0.03]" />; }
