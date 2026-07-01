import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sek } from "@/lib/format";
import { Briefcase, Wallet, Bell, Plus, Calendar as CalendarIcon } from "lucide-react";
import { ActionSheet } from "@/components/action-sheet/ActionSheet";
import { QuickActionsBar } from "@/components/quick-actions-bar";

export const Route = createFileRoute("/_app/idag")({ component: TodayPage });

function isoLocal(d: Date) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const WEEKDAYS = ["söndag","måndag","tisdag","onsdag","torsdag","fredag","lördag"];
const MONTHS = ["januari","februari","mars","april","maj","juni","juli","augusti","september","oktober","november","december"];

function TodayPage() {
  const [actionOpen, setActionOpen] = useState(false);
  const today = useMemo(() => new Date(), []);
  const todayIso = isoLocal(today);
  const startOfDay = useMemo(() => { const d = new Date(today); d.setHours(0,0,0,0); return d.toISOString(); }, [today]);
  const endOfDay   = useMemo(() => { const d = new Date(today); d.setHours(23,59,59,999); return d.toISOString(); }, [today]);

  const shifts = useQuery({
    queryKey: ["today-shifts", todayIso],
    queryFn: async () => {
      const { data } = await supabase.from("shifts").select("*")
        .gte("starts_at", startOfDay).lte("starts_at", endOfDay).order("starts_at");
      return data ?? [];
    },
  });

  const expenses = useQuery({
    queryKey: ["today-expenses", todayIso],
    queryFn: async () => {
      const { data } = await supabase.from("expenses").select("*")
        .gte("occurred_at", startOfDay).lte("occurred_at", endOfDay).order("occurred_at", { ascending: false });
      return data ?? [];
    },
  });

  const reminders = useQuery({
    queryKey: ["today-reminders", todayIso],
    queryFn: async () => {
      const { data } = await supabase.from("reminders").select("*")
        .gte("remind_at", startOfDay).lte("remind_at", endOfDay).order("remind_at");
      return data ?? [];
    },
  });

  const totalExpenses = (expenses.data ?? []).reduce((s, e: any) => s + Number(e.amount), 0);
  const hasAnything = (shifts.data?.length ?? 0) + (expenses.data?.length ?? 0) + (reminders.data?.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <header>
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          {WEEKDAYS[today.getDay()]} · {today.getDate()} {MONTHS[today.getMonth()]}
        </div>
        <h1 className="display mt-1 text-3xl">Idag</h1>
      </header>

      {!hasAnything && (
        <div className="rounded-3xl border border-border bg-white/[0.02] p-8 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[oklch(0.85_0.12_85/0.12)] text-[oklch(0.85_0.12_85)]">
            <CalendarIcon className="h-6 w-6" />
          </div>
          <div className="mt-4 text-sm text-muted-foreground">Inget planerat idag.</div>
          <button
            onClick={() => setActionOpen(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-[oklch(0.88_0.1_85)] to-[oklch(0.7_0.12_75)] px-5 py-2 text-sm font-medium text-background"
          >
            <Plus className="h-4 w-4" /> Vad vill du göra?
          </button>
        </div>
      )}

      {(shifts.data?.length ?? 0) > 0 && (
        <Card icon={Briefcase} title="Arbete">
          <ul className="divide-y divide-border">
            {(shifts.data ?? []).map((s: any) => (
              <li key={s.id} className="flex items-center justify-between py-3 text-sm">
                <span>{fmt(s.starts_at)} – {fmt(s.ends_at)}</span>
                <span className="text-muted-foreground">rast {s.break_minutes} min</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {(expenses.data?.length ?? 0) > 0 && (
        <Card icon={Wallet} title="Pengar idag" trailing={sek(totalExpenses)}>
          <ul className="divide-y divide-border">
            {(expenses.data ?? []).map((e: any) => (
              <li key={e.id} className="flex items-center justify-between py-3 text-sm">
                <span>{e.description || e.merchant || e.category}</span>
                <span className="font-medium">{sek(Number(e.amount))}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {(reminders.data?.length ?? 0) > 0 && (
        <Card icon={Bell} title="Påminnelser">
          <ul className="divide-y divide-border">
            {(reminders.data ?? []).map((r: any) => (
              <li key={r.id} className="flex items-center justify-between py-3 text-sm">
                <span>{r.title}</span>
                <span className="text-muted-foreground">{fmt(r.remind_at)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="flex justify-center pt-2">
        <Link to="/kalender" className="text-xs text-muted-foreground underline-offset-4 hover:underline">
          Se hela kalendern →
        </Link>
      </div>

      <ActionSheet open={actionOpen} onOpenChange={setActionOpen} defaultDate={todayIso} />
    </div>
  );
}

function Card({ icon: Icon, title, trailing, children }: { icon: any; title: string; trailing?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-border bg-white/[0.02] p-5">
      <header className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-[oklch(0.85_0.12_85)]" />
          <h2 className="text-sm font-medium">{title}</h2>
        </div>
        {trailing && <div className="display text-base">{trailing}</div>}
      </header>
      {children}
    </section>
  );
}

function fmt(ts: string) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}
