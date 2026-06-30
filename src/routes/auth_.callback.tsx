import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth_/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  const router = useRouter();
  const [msg, setMsg] = useState("Loggar in...");

  useEffect(() => {
    let cancelled = false;
    async function go() {
      // Försök i upp till 5s, väntar in session från OAuth / magic link
      for (let i = 0; i < 25; i++) {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        if (data.session) {
          router.navigate({ to: "/dashboard" });
          return;
        }
        await new Promise((r) => setTimeout(r, 200));
      }
      setMsg("Vi kunde inte slutföra inloggningen. Försök igen.");
      setTimeout(() => router.navigate({ to: "/auth" }), 1500);
    }
    go();
    return () => { cancelled = true; };
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass rounded-2xl p-8 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-[oklch(0.85_0.12_85)]" />
        <p className="mt-4 text-sm text-muted-foreground">{msg}</p>
      </div>
    </div>
  );
}
