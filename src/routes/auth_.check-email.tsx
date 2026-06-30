import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, RefreshCw, CheckCircle2, ArrowLeft, Pencil } from "lucide-react";
import { mapAuthError } from "@/lib/auth-errors";

export const Route = createFileRoute("/auth_/check-email")({
  validateSearch: z.object({ email: z.string().optional() }),
  component: CheckEmailPage,
});

function CheckEmailPage() {
  const router = useRouter();
  const { email } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);

  async function resend() {
    if (!email) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/confirmed` },
      });
      if (error) throw error;
      toast.success("Nytt bekräftelsemail skickat.");
    } catch (e) {
      toast.error(mapAuthError(e).message);
    } finally {
      setBusy(false);
    }
  }

  async function checkConfirmed() {
    setChecking(true);
    const { data: { session } } = await supabase.auth.getSession();
    setChecking(false);
    if (session) {
      toast.success("Bekräftat. Loggar in...");
      router.navigate({ to: "/dashboard" });
    } else {
      toast.info("Vi ser ingen aktiv session ännu. Klicka på länken i mailet.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass max-w-md rounded-3xl p-10 text-center">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[oklch(0.85_0.12_85)] to-[oklch(0.6_0.1_75)] text-background">
          <Mail className="h-6 w-6" />
        </div>
        <h1 className="display text-2xl">Kolla din mail</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Vi har skickat en bekräftelselänk till
        </p>
        <p className="mt-1 font-medium">{email || "din e-post"}</p>
        <p className="mt-3 text-xs text-muted-foreground">
          Kontrollera även skräpposten. Länken är giltig i 24 timmar.
        </p>

        <div className="mt-6 grid gap-2">
          <button onClick={checkConfirmed} disabled={checking}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[oklch(0.88_0.1_85)] to-[oklch(0.7_0.12_75)] px-4 py-3 text-sm font-semibold text-background disabled:opacity-50">
            <CheckCircle2 className="h-4 w-4" /> Jag har bekräftat, fortsätt
          </button>
          <button onClick={resend} disabled={busy || !email}
            className="flex items-center justify-center gap-2 rounded-xl border border-border bg-white/[0.04] px-4 py-3 text-sm disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} /> Skicka igen
          </button>
          <Link to="/auth" className="flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm">
            <Pencil className="h-4 w-4" /> Ändra e-post
          </Link>
          <Link to="/auth" className="mt-2 inline-flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Tillbaka till login
          </Link>
        </div>
      </div>
    </div>
  );
}
