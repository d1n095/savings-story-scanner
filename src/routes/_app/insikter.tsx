import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sek } from "@/lib/format";
import { getActiveWorkProfile } from "@/lib/active-work-profile";
import { Sparkles, AlertTriangle, TrendingUp, Lightbulb } from "lucide-react";

export const Route = createFileRoute("/_app/insikter")({ component: InsikterPage });

type Insight = {
  icon: React.ReactNode;
  severity: "info" | "warning" | "good";
  title: string;
  body: string;
};

function InsikterPage() {
  const activeWorkProfile = useQuery({
    queryKey: ["active-work-profile"],
    queryFn: getActiveWorkProfile,
  });
  const shifts = useQuery({
    queryKey: ["ins-shifts"],
    queryFn: async () =>
      (await supabase.from("shifts").select("*").gte("starts_at", monthStart())).data ?? [],
  });
  const expenses = useQuery({
    queryKey: ["ins-exp"],
    queryFn: async () =>
      (await supabase.from("expenses").select("*").gte("occurred_at", monthStart())).data ?? [],
  });

  const insights = useMemo<Insight[]>(() => {
    const out: Insight[] = [];
    const income = (shifts.data ?? []).reduce((s, r: any) => s + Number(r.total_amount || 0), 0);
    const spend = (expenses.data ?? []).reduce((s, r: any) => s + Number(r.amount), 0);
    const subs = (expenses.data ?? []).filter((e: any) => e.is_recurring);
    const subsTotal = subs.reduce((s, r: any) => s + Number(r.amount), 0);
    const rate = Number(activeWorkProfile.data?.hourlyRate ?? 0);

    if (income > 0 && spend > income) {
      out.push({
        icon: <AlertTriangle className="h-4 w-4" />,
        severity: "warning",
        title: "Du spenderar mer än du tjänar denna månad",
        body: `Skillnad: ${sek(spend - income)}. Granska de tre största utgifterna nedan och se vilka som kan pausas.`,
      });
    }
    if (subsTotal > 500) {
      const hours = rate > 0 ? ` (${(subsTotal / rate).toFixed(1)}h jobb)` : "";
      out.push({
        icon: <TrendingUp className="h-4 w-4" />,
        severity: "info",
        title: `Prenumerationer kostar dig ${sek(subsTotal)}/mån${hours}`,
        body: `Du har ${subs.length} aktiva. Använder du verkligen alla? En enda obrukad prenumeration på 99 kr = 1 188 kr om året.`,
      });
    }
    if (rate === 0) {
      out.push({
        icon: <Lightbulb className="h-4 w-4" />,
        severity: "info",
        title: "Lägg in din timlön för smartare insikter",
        body: "Då kan vi visa varje köp i 'arbetstimmar' — den enskilt mest beteendeförändrande siffran i appen.",
      });
    }
    if ((shifts.data ?? []).length === 0) {
      out.push({
        icon: <Lightbulb className="h-4 w-4" />,
        severity: "info",
        title: "Lägg in ditt schema",
        body: "Vi räknar OB, helg och röd dag automatiskt — och visar nettolön efter skatt.",
      });
    }
    if (income > 0 && spend > 0 && spend < income * 0.7) {
      out.push({
        icon: <Sparkles className="h-4 w-4" />,
        severity: "good",
        title: "Stark sparkvot just nu",
        body: `Du har ${sek(income - spend)} kvar — det är ${Math.round((1 - spend / income) * 100)}% av månadsinkomsten. Lägg minst hälften i buffert innan månadsskiftet.`,
      });
    }
    if (out.length === 0) {
      out.push({
        icon: <Sparkles className="h-4 w-4" />,
        severity: "good",
        title: "Allt ser balanserat ut",
        body: "Inga varningssignaler upptäckta. Fortsätt logga så blir insikterna vassare.",
      });
    }
    return out;
  }, [shifts.data, expenses.data, activeWorkProfile.data]);

  return (
    <div className="space-y-6">
      <header>
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Insikter</div>
        <h1 className="display text-4xl">
          Din <span className="gold-text">tysta rådgivare</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Lokala signaler från ditt mönster. Inget skickas någonstans.
        </p>
      </header>

      <ul className="grid gap-4 md:grid-cols-2">
        {insights.map((ins, i) => {
          const tone =
            ins.severity === "warning"
              ? "border-[oklch(0.7_0.12_28/0.35)] bg-[oklch(0.7_0.12_28/0.05)] text-[oklch(0.78_0.1_28)]"
              : ins.severity === "good"
                ? "border-[oklch(0.55_0.1_165/0.35)] bg-[oklch(0.55_0.1_165/0.05)] text-[oklch(0.75_0.1_165)]"
                : "border-[oklch(0.78_0.105_85/0.3)] bg-[oklch(0.78_0.105_85/0.05)] text-[oklch(0.85_0.12_85)]";
          return (
            <li key={i} className="glass rounded-3xl p-6">
              <div
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] ${tone}`}
              >
                {ins.icon}
                {ins.severity === "warning"
                  ? "Varning"
                  : ins.severity === "good"
                    ? "Bra"
                    : "Insikt"}
              </div>
              <h3 className="display mt-3 text-xl">{ins.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{ins.body}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function monthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}
