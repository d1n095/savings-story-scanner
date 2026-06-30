import { createFileRoute, redirect, Link, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Calendar, Wallet, Briefcase, Sparkles, Settings, LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/auth" });
  },
  component: AppLayout,
});

const NAV = [
  { to: "/dashboard", label: "Översikt", icon: LayoutDashboard },
  { to: "/kalender", label: "Kalender", icon: Calendar },
  { to: "/jobb", label: "Jobb & lön", icon: Briefcase },
  { to: "/pengar", label: "Pengar", icon: Wallet },
  { to: "/insikter", label: "Insikter", icon: Sparkles },
  { to: "/installningar", label: "Inställningar", icon: Settings },
] as const;

function AppLayout() {
  const router = useRouter();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-screen lg:flex">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 transform border-r border-border bg-surface/70 backdrop-blur-xl transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3 px-6 pt-7 pb-6">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-[oklch(0.85_0.12_85)] to-[oklch(0.6_0.1_75)] text-background shadow-[0_8px_24px_-8px_oklch(0.78_0.105_85/0.6)]">
              <span className="display text-lg">M</span>
            </div>
            <div>
              <div className="display text-base leading-tight">My Money <span className="gold-text">Master</span></div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Life OS · 2030</div>
            </div>
          </div>
          <nav className="flex-1 space-y-1 px-3">
            {NAV.map((item) => {
              const active = path.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                    active
                      ? "bg-gradient-to-r from-[oklch(0.78_0.105_85/0.18)] to-transparent text-foreground"
                      : "text-muted-foreground hover:bg-white/[0.03] hover:text-foreground",
                  )}
                >
                  <Icon className={cn("h-4 w-4", active && "text-[oklch(0.85_0.12_85)]")} />
                  <span>{item.label}</span>
                  {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[oklch(0.85_0.12_85)] shadow-[0_0_12px_oklch(0.85_0.12_85)]" />}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-border px-4 py-4">
            <div className="mb-3 px-2">
              <div className="text-xs text-muted-foreground">Inloggad som</div>
              <div className="truncate text-sm">{email || "—"}</div>
            </div>
            <button
              onClick={signOut}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              Logga ut
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile topbar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/70 px-4 py-3 backdrop-blur-xl lg:hidden">
        <button onClick={() => setOpen((v) => !v)} className="rounded-lg border border-border p-2">
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
        <div className="display text-base">My Money <span className="gold-text">Master</span></div>
        <div className="w-9" />
      </header>

      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-10">
          <Outlet />
        </div>
      </main>

      {open && <div onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-black/40 lg:hidden" />}
    </div>
  );
}
