import { createFileRoute, Link } from "@tanstack/react-router";
import { User, Briefcase, Bell, Sliders, ChevronRight, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_app/installningar")({ component: SettingsHub });

const CARDS = [
  {
    to: "/installningar/profil-och-regler",
    icon: User,
    title: "Profil",
    desc: "Namn, standardvärden och OB-regler",
  },
  {
    to: "/installningar/lon-arbete",
    icon: Briefcase,
    title: "Lön & Arbete",
    desc: "Arbetsprofiler, timlön, skatt, raster, ersättningar",
  },
  {
    to: "/installningar",
    icon: Bell,
    title: "Notiser",
    desc: "Påminnelser, signaler och tysta tider",
    soon: true,
  },
  {
    to: "/installningar",
    icon: Sliders,
    title: "Avancerat",
    desc: "Export, integrationer, API och utvecklarval",
    soon: true,
  },
] as const;

function SettingsHub() {
  return (
    <div className="space-y-8">
      <header>
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Inställningar</div>
        <h1 className="display text-4xl">Allt på sin plats</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          De flesta behöver aldrig öppna detta. Vi har redan satt smarta standardvärden åt dig.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {CARDS.map((c) => {
          const Icon = c.icon;
          const disabled = "soon" in c && c.soon;
          const inner = (
            <>
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[oklch(0.85_0.12_85/0.12)] text-[oklch(0.85_0.12_85)]">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="display text-lg">{c.title}</div>
                    {disabled && (
                      <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                        Snart
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{c.desc}</div>
                </div>
                {!disabled && <ChevronRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-[oklch(0.85_0.12_85)]" />}
              </div>
            </>
          );
          if (disabled) {
            return (
              <div key={c.title} className="group rounded-3xl border border-border bg-white/[0.02] p-5 opacity-60">
                {inner}
              </div>
            );
          }
          return (
            <Link
              key={c.title}
              to={c.to}
              className="group rounded-3xl border border-border bg-white/[0.02] p-5 transition hover:border-[oklch(0.85_0.12_85/0.5)] hover:bg-[oklch(0.85_0.12_85/0.04)]"
            >
              {inner}
            </Link>
          );
        })}
      </div>

      <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-[oklch(0.75_0.1_165)]" />
        Endast du kan läsa eller ändra din data.
      </div>
    </div>
  );
}
