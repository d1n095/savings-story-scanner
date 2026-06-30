import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, ArrowLeft, ArrowRight } from "lucide-react";
import { mapAuthError } from "@/lib/auth-errors";

export const Route = createFileRoute("/auth_/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      toast.error(mapAuthError(err).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass w-full max-w-md rounded-3xl p-8">
        <h1 className="display text-2xl">Glömt lösenord</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Skriv in din e-post så skickar vi en återställningslänk.
        </p>

        {sent ? (
          <div className="mt-6 rounded-xl border border-border bg-white/[0.03] p-4 text-sm">
            Vi har skickat en länk till <b>{email}</b>. Kolla även skräpposten.
            <div className="mt-4">
              <Link to="/auth" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-3 w-3" /> Tillbaka till login
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-[11px] uppercase tracking-wider text-muted-foreground">E-post</span>
              <span className="flex items-center gap-2 rounded-xl border border-border bg-white/[0.03] px-3 py-2.5">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                  placeholder="du@exempel.se" />
              </span>
            </label>
            <button type="submit" disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[oklch(0.88_0.1_85)] to-[oklch(0.7_0.12_75)] px-4 py-3 text-sm font-semibold text-background disabled:opacity-50">
              {loading ? "Skickar..." : "Skicka återställningslänk"} <ArrowRight className="h-4 w-4" />
            </button>
            <Link to="/auth" className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3 w-3" /> Tillbaka
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
