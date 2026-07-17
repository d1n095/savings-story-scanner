import { createFileRoute, redirect, Link, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Calendar, Wallet, Sun, MoreHorizontal, Settings, LogOut, Menu, X,
  CalendarRange, Briefcase, LayoutDashboard, Sparkles, Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ActionFab } from "@/components/action-sheet/ActionSheet";

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/auth" });
  },
  component: AppLayout,
});

// Nivå 1 — bara det vanligaste. "Skapa" sker via FAB, inte via nav.
const PRIMARY = [
  { to: "/idag",     label: "Idag",     icon: Sun },
  { to: "/kalender", label: "Kalender", icon: Calendar },
  { to: "/pengar",   label: "Pengar",   icon: Wallet },
] as const;

// Bakom "Mer" — finns kvar för djupgående arbete, men skymd från första vyn.
const SECONDARY = [
  { to: "/main-ai",   label: "MainAI",      icon: Brain },
  { to: "/insikter",  label: "Insikter",    icon: Sparkles },
  { to: "/planering", label: "Planering",   icon: CalendarRange },
  { to: "/jobb",      label: "Jobb & lön",  icon: Briefcase },
  { to: "/dashboard", label: "Översikt",    icon: LayoutDashboard },
] as const;

function AppLayout() {
  const router = useRouter();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [email, setEmail] = useState<string>("");
  const moreRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth" });
  }

  const initial = (email?.[0] || "U").toUpperCase();
  const inSecondary = SECONDARY.some((s) => path.startsWith(s.to));

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
          <Link to="/idag" onClick={() => setOpen(false)} className="flex items-center gap-3 px-6 pt-7 pb-6 hover:opacity-90">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-[oklch(0.85_0.12_85)] to-[oklch(0.6_0.1_75)] text-background shadow-[0_8px_24px_-8px_oklch(0.78_0.105_85/0.6)]">
              <span className="display text-lg">M</span>
            </div>
            <div>
              <div className="display text-base leading-tight">My Money <span className="gold-text">Master</span></div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Life OS · 2030</div>
            </div>
          </Link>

          <nav className="flex-1 space-y-1 px-3">
            {PRIMARY.map((item) => {
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

            {/* Mer */}
            <div ref={moreRef} className="relative pt-2">
              <button
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                  inSecondary
                    ? "bg-gradient-to-r from-[oklch(0.78_0.105_85/0.18)] to-transparent text-foreground"
                    : "text-muted-foreground hover:bg-white/[0.03] hover:text-foreground",
                )}
              >
                <MoreHorizontal className={cn("h-4 w-4", inSecondary && "text-[oklch(0.85_0.12_85)]")} />
                <span>Mer</span>
              </button>
              {moreOpen && (
                <div className="ml-7 mt-1 space-y-0.5 border-l border-border pl-2">
                  {SECONDARY.map((item) => {
                    const active = path.startsWith(item.to);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => { setMoreOpen(false); setOpen(false); }}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs transition",
                          active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>

          {/* Avatar + meny */}
          <div ref={accountRef} className="relative border-t border-border px-3 py-3">
            <button
              onClick={() => setAccountOpen((v) => !v)}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-white/[0.04]"
            >
              <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[oklch(0.85_0.12_85)] to-[oklch(0.6_0.1_75)] text-sm font-semibold text-background">
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">{email || "—"}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Konto</div>
              </div>
            </button>
            {accountOpen && (
              <div className="absolute bottom-16 left-3 right-3 z-50 overflow-hidden rounded-xl border border-border bg-surface/95 backdrop-blur-xl shadow-[0_12px_32px_-8px_rgba(0,0,0,0.6)]">
                <Link
                  to="/installningar"
                  onClick={() => { setAccountOpen(false); setOpen(false); }}
                  className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"
                >
                  <Settings className="h-4 w-4" />
                  Inställningar
                </Link>
                <button
                  onClick={signOut}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" />
                  Logga ut
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile topbar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/70 px-4 py-3 backdrop-blur-xl lg:hidden">
        <button onClick={() => setOpen((v) => !v)} className="rounded-lg border border-border p-2">
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
        <Link to="/idag" className="display text-base hover:opacity-90">My Money <span className="gold-text">Master</span></Link>
        <Link
          to="/installningar"
          aria-label="Inställningar"
          className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[oklch(0.85_0.12_85)] to-[oklch(0.6_0.1_75)] text-xs font-semibold text-background"
        >
          {initial}
        </Link>
      </header>

      <main className="min-w-0 flex-1">
        <div
          className={cn(
            "mx-auto w-full",
            path.startsWith("/main-ai")
              ? "flex h-[calc(100dvh-56px)] max-w-none flex-col px-0 lg:h-dvh"
              : "max-w-6xl px-4 py-6 pb-28 sm:px-6 lg:py-10",
          )}
        >
          <Outlet />
        </div>
      </main>

      {open && <div onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-black/40 lg:hidden" />}

      {/* Global "Vad vill du göra?"-knapp — dold på MainAI där den skulle täcka chatten */}
      {!path.startsWith("/main-ai") && <ActionFab />}
    </div>
  );
}
