import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/auth_/confirmed")({
  component: ConfirmedPage,
});

function ConfirmedPage() {
  const router = useRouter();

  useEffect(() => {
    // Auto-redirect om session redan finns
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setTimeout(() => router.navigate({ to: "/dashboard" }), 1200);
    });
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass max-w-md rounded-3xl p-10 text-center">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[oklch(0.85_0.12_85)] to-[oklch(0.6_0.1_75)] text-background">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h1 className="display text-2xl">E-post bekräftad</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Välkommen till My Money Master. Vi tar dig till din översikt.
        </p>
        <Link to="/dashboard"
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[oklch(0.88_0.1_85)] to-[oklch(0.7_0.12_75)] px-5 py-3 text-sm font-semibold text-background">
          Fortsätt till översikten <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
