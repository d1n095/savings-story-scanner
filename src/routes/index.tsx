import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Brain, Calendar, Wallet, Sparkles, ShieldCheck, Briefcase } from "lucide-react";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data: { session } } = await supabase.auth.getSession();
    if (session) throw redirect({ to: "/kalender" });
  },
  component: Landing,
});

function Landing() {
  return (
    <div className="relative overflow-hidden">
      {/* Top nav */}
      <header className="absolute top-0 left-0 right-0 z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="display text-xl">My Money <span className="gold-text">Master</span></div>
        <Link
          to="/auth"
          className="rounded-full border border-[oklch(0.78_0.105_85/0.4)] bg-white/[0.03] px-4 py-1.5 text-sm transition hover:bg-white/[0.07]"
        >
          Logga in
        </Link>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-32 left-1/2 h-[44rem] w-[70rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,oklch(0.78_0.105_85/0.14),transparent)]" />
          <div className="absolute top-60 right-0 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(closest-side,oklch(0.55_0.08_165/0.10),transparent)]" />
          <div className="absolute top-40 left-0 h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(closest-side,oklch(0.55_0.1_240/0.08),transparent)]" />
        </div>

        <div className="mx-auto max-w-5xl px-6 pt-40 pb-24 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full hairline px-4 py-1.5 text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.85_0.12_85)] shadow-[0_0_10px_oklch(0.85_0.12_85)]" />
            Privatjet-känsla för din privatekonomi
          </div>
          <h1 className="display text-6xl leading-[1.02] sm:text-7xl md:text-8xl">
            Ekonomi som <span className="gold-text italic">förstår</span> dig.
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Sveriges första personliga <em>Life OS</em>. Lön, OB, schema, utgifter och kalender —
            sömlöst sammanvävt till ett enda intelligent flöde.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/auth"
              className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-[oklch(0.88_0.1_85)] to-[oklch(0.7_0.12_75)] px-6 py-3 text-sm font-semibold text-background shadow-[0_18px_40px_-18px_oklch(0.78_0.105_85/0.6)] transition hover:shadow-[0_28px_60px_-18px_oklch(0.78_0.105_85/0.8)]"
            >
              Kom igång gratis <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
            <a href="#funktioner" className="rounded-full border border-border bg-white/[0.03] px-6 py-3 text-sm hover:bg-white/[0.06]">
              Se hur det funkar
            </a>
          </div>
          <div className="mt-6 text-xs text-muted-foreground">Ingen prenumeration. Ingen reklam. Bara du och din data.</div>
        </div>
      </section>

      {/* Hero panel mock */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-5xl">
          <div className="glass overflow-hidden rounded-3xl p-1">
            <div className="rounded-[20px] bg-gradient-to-br from-background to-surface p-8 sm:p-10">
              <div className="grid gap-6 sm:grid-cols-3">
                <Stat label="Money Score" value="84" sub="A · väldigt bra" />
                <Stat label="Lön denna månad" value="32 480 kr" sub="+ 3 480 OB" />
                <Stat label="Buffert" value="3.2 mån" sub="mål 6.0" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="funktioner" className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="display text-center text-4xl sm:text-5xl">Tolv motorer. <span className="gold-text">Ett</span> liv.</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
            Varje del talar med de andra — så att du kan se helheten utan att lyfta ett finger.
          </p>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="glass group rounded-2xl p-6 transition hover:translate-y-[-2px]">
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[oklch(0.78_0.105_85/0.2)] to-transparent text-[oklch(0.85_0.12_85)]">
                  <f.icon className="h-5 w-5" />
                </div>
                <div className="display text-lg">{f.title}</div>
                <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border px-6 py-10 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} My Money Master · Byggd i Sverige · RLS-säkrad data
      </footer>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="num mt-2 text-5xl gold-text">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

const FEATURES = [
  { title: "Calendar Engine", body: "Svenska röda dagar, namnsdagar, midsommar och påsk — allt inbyggt.", icon: Calendar },
  { title: "Salary Engine", body: "Bygg dina egna OB-regler. Vi räknar varje minut åt dig — natt, helg och röd dag.", icon: Briefcase },
  { title: "Finance Engine", body: "Money Score, prenumerationsjakt och kostnad-i-arbetstid för varje köp.", icon: Wallet },
  { title: "AI Engine", body: "Proaktiva signaler innan minus uppstår. Lär sig dina mönster lokalt.", icon: Brain },
  { title: "Reminder Engine", body: "Påminnelser kopplade till räkningar, garantier och högtider.", icon: Sparkles },
  { title: "Banknivå-säkerhet", body: "RLS säkrar att bara du ser dina rader. Inget delas, inget säljs.", icon: ShieldCheck },
];
