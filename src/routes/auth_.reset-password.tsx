import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Lock, ArrowRight } from "lucide-react";
import { mapAuthError } from "@/lib/auth-errors";

export const Route = createFileRoute("/auth_/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    // Supabase sätter session automatiskt från recovery-länken (hash).
    // Vänta in PASSWORD_RECOVERY-event eller existerande session.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Lösenordet har uppdaterats.");
      router.navigate({ to: "/dashboard" });
    } catch (e) {
      setErr(mapAuthError(e).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass w-full max-w-md rounded-3xl p-8">
        <h1 className="display text-2xl">Nytt lösenord</h1>
        <p className="mt-2 text-sm text-muted-foreground">Välj ett nytt lösenord — minst 6 tecken.</p>

        {!ready ? (
          <p className="mt-6 text-sm text-muted-foreground">
            Validerar länken... Om inget händer, klicka på länken i mailet på nytt.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-3">
            {err && <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">{err}</div>}
            <label className="block">
              <span className="mb-1.5 block text-[11px] uppercase tracking-wider text-muted-foreground">Lösenord</span>
              <span className="flex items-center gap-2 rounded-xl border border-border bg-white/[0.03] px-3 py-2.5">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none" placeholder="Minst 6 tecken" />
              </span>
            </label>
            <button type="submit" disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[oklch(0.88_0.1_85)] to-[oklch(0.7_0.12_75)] px-4 py-3 text-sm font-semibold text-background disabled:opacity-50">
              {loading ? "Sparar..." : "Spara nytt lösenord"} <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
