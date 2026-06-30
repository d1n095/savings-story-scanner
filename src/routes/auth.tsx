import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { ArrowRight, Mail, Lock, Sparkles } from "lucide-react";

export const Route = createFileRoute("/auth")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data: { session } } = await supabase.auth.getSession();
    if (session) throw redirect({ to: "/dashboard" });
  },
  component: AuthPage,
});

function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  // Defensive: redirect if session appears
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) router.navigate({ to: "/dashboard" });
    });
    return () => subscription.unsubscribe();
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            data: { display_name: name || email.split("@")[0] },
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        });
        if (error) throw error;
        toast.success("Konto skapat! Du är inloggad.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Välkommen tillbaka.");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Något gick fel");
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    setLoading(true);
    const res = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/dashboard`,
    });
    if (res?.error) {
      toast.error(res.error.message ?? "Google-inloggning misslyckades");
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Hero glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[40rem] w-[60rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,oklch(0.78_0.105_85/0.12),transparent)]" />
        <div className="absolute -bottom-40 right-0 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(closest-side,oklch(0.55_0.08_165/0.10),transparent)]" />
      </div>

      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 items-center gap-12 px-6 py-12 lg:grid-cols-2">
        {/* Left: brand */}
        <div className="hidden lg:block">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full hairline px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3 text-[oklch(0.85_0.12_85)]" /> Operativsystem för ditt ekonomiska liv
          </div>
          <h1 className="display text-6xl leading-[1.05]">
            My Money <span className="gold-text">Master</span>
          </h1>
          <p className="mt-6 max-w-md text-lg text-muted-foreground">
            Lön, OB, schema, utgifter och kalender — sammanvävt till ett enda intelligent flöde.
            Inga API:er. Inga prenumerationer. Bara klarhet.
          </p>
          <ul className="mt-10 space-y-4 text-sm">
            {[
              "Automatisk OB-beräkning för varje pass",
              "Svenska helgdagar & namnsdagar inbyggt",
              "Money Score som visar hur dina vanor utvecklas",
              "Bankniva-säkerhet — bara du ser din data",
            ].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.85_0.12_85)] shadow-[0_0_10px_oklch(0.85_0.12_85)]" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        {/* Right: card */}
        <div className="glass mx-auto w-full max-w-md rounded-3xl p-8">
          <div className="mb-6 text-center">
            <h2 className="display text-2xl">{mode === "signin" ? "Välkommen tillbaka" : "Skapa ditt konto"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "signin" ? "Logga in för att fortsätta" : "Det tar 20 sekunder. Inget kreditkort."}
            </p>
          </div>

          <button
            type="button"
            onClick={google}
            disabled={loading}
            className="mb-4 flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-white/[0.04] px-4 py-3 text-sm font-medium transition hover:bg-white/[0.07] disabled:opacity-50"
          >
            <GoogleIcon /> Fortsätt med Google
          </button>

          <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> eller med e-post <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <Field label="Namn">
                <input
                  value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                  placeholder="Vad får vi kalla dig?"
                />
              </Field>
            )}
            <Field label="E-post" icon={<Mail className="h-4 w-4 text-muted-foreground" />}>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                placeholder="du@exempel.se"
              />
            </Field>
            <Field label="Lösenord" icon={<Lock className="h-4 w-4 text-muted-foreground" />}>
              <input
                type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                placeholder="Minst 6 tecken"
              />
            </Field>

            <button
              type="submit" disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[oklch(0.88_0.1_85)] to-[oklch(0.7_0.12_75)] px-4 py-3 text-sm font-semibold text-background shadow-[0_10px_30px_-10px_oklch(0.78_0.105_85/0.5)] transition hover:opacity-95 disabled:opacity-50"
            >
              {loading ? "..." : mode === "signin" ? "Logga in" : "Skapa konto"} <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "Ny här? " : "Har du redan ett konto? "}
            <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="text-[oklch(0.85_0.12_85)] hover:underline">
              {mode === "signin" ? "Skapa konto" : "Logga in"}
            </button>
          </p>
          <p className="mt-3 text-center text-[11px] text-muted-foreground/70">
            Din data lagras krypterat. Endast du har åtkomst (RLS aktivt).
          </p>
        </div>
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60">
        <Link to="/">← tillbaka</Link>
      </div>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="flex items-center gap-2 rounded-xl border border-border bg-white/[0.03] px-3 py-2.5 focus-within:border-[oklch(0.78_0.105_85/0.5)]">
        {icon}{children}
      </span>
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.25-1.66 3.67-5.5 3.67A6.27 6.27 0 0 1 5.73 12 6.27 6.27 0 0 1 12 5.73c1.95 0 3.27.83 4.02 1.55l2.74-2.64C16.97 3 14.7 2 12 2 6.48 2 2 6.48 2 12s4.48 10 10 10c5.78 0 9.6-4.06 9.6-9.78 0-.66-.07-1.16-.16-1.66H12Z"/>
    </svg>
  );
}
