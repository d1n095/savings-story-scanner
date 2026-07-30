import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Blocks, Check, Lock, ShieldCheck, HardDrive, Package, Sparkles, CircleSlash,
} from "lucide-react";
import {
  lifeStoreCatalog,
  preinstalledModules,
  isApiCompatible,
  LIFEAPP_API_VERSION,
  type LifeModuleManifest,
} from "@/platform";

export const Route = createFileRoute("/_app/tillagg")({
  head: () => ({
    meta: [
      { title: "Life Store — tillägg och moduler" },
      { name: "description", content: "Installera, aktivera och granska LifeApp-moduler och deras behörigheter." },
      { property: "og:title", content: "Life Store — tillägg och moduler" },
      { property: "og:description", content: "Installera, aktivera och granska LifeApp-moduler och deras behörigheter." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LifeStore,
});

const INSTALLED = new Set(preinstalledModules.map((m) => m.id));

function priceLabel(m: LifeModuleManifest) {
  switch (m.pricing.kind) {
    case "first-party":
      return "Ingår";
    case "free":
      return "Gratis";
    case "paid":
      return `${m.pricing.priceSek} kr/${m.pricing.billing === "monthly" ? "mån" : m.pricing.billing === "yearly" ? "år" : "engång"}`;
  }
}

function LifeStore() {
  const [tab, setTab] = useState<"installerade" | "tillgangliga">("installerade");
  const [openId, setOpenId] = useState<string | null>(null);

  const list = useMemo(
    () =>
      lifeStoreCatalog.filter((m) =>
        tab === "installerade" ? INSTALLED.has(m.id) : !INSTALLED.has(m.id),
      ),
    [tab],
  );

  return (
    <div className="space-y-8">
      <header>
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Life Store</div>
        <h1 className="display text-4xl">Tillägg</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          LifeApp är ett skal. Varje del — kalender, ekonomi, lön — är en modul som kan
          installeras, uppdateras och stängas av utan att påverka resten.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          LifeApp API {LIFEAPP_API_VERSION} · {lifeStoreCatalog.length} moduler i katalogen
        </p>
      </header>

      <div className="inline-flex rounded-full border border-border p-1">
        {(["installerade", "tillgangliga"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-xs transition ${
              tab === t
                ? "bg-[oklch(0.85_0.12_85/0.14)] text-[oklch(0.85_0.12_85)]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "installerade" ? "Installerade" : "Tillgängliga"}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {list.map((m) => {
          const compatible = isApiCompatible(m);
          const open = openId === m.id;
          return (
            <div
              key={m.id}
              className="rounded-3xl border border-border bg-white/[0.02] p-5 transition hover:border-[oklch(0.85_0.12_85/0.4)]"
            >
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[oklch(0.85_0.12_85/0.12)] text-[oklch(0.85_0.12_85)]">
                  {INSTALLED.has(m.id) ? <Package className="h-5 w-5" /> : <Blocks className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="display text-lg">{m.name}</div>
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                      v{m.version}
                    </span>
                    {INSTALLED.has(m.id) ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[oklch(0.75_0.1_165/0.4)] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[oklch(0.75_0.1_165)]">
                        <Check className="h-3 w-3" /> Aktiv
                      </span>
                    ) : (
                      <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                        Snart
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{m.description}</div>

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5" /> {priceLabel(m)}
                    </span>
                    {m.estimatedStorageKb != null && (
                      <span className="inline-flex items-center gap-1">
                        <HardDrive className="h-3.5 w-3.5" /> ~{Math.round(m.estimatedStorageKb / 100) / 10} MB
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      {compatible ? (
                        <>
                          <ShieldCheck className="h-3.5 w-3.5 text-[oklch(0.75_0.1_165)]" /> Kompatibel
                        </>
                      ) : (
                        <>
                          <CircleSlash className="h-3.5 w-3.5" /> Kräver nyare LifeApp
                        </>
                      )}
                    </span>
                    {m.standalone?.enabled && (
                      <span className="inline-flex items-center gap-1">
                        <Package className="h-3.5 w-3.5" /> Fristående app möjlig
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => setOpenId(open ? null : m.id)}
                    className="mt-3 text-[11px] uppercase tracking-wider text-[oklch(0.85_0.12_85)] hover:underline"
                  >
                    {open ? "Dölj behörigheter" : `Behörigheter (${m.permissions.length})`}
                  </button>

                  {open && (
                    <ul className="mt-3 space-y-2 border-t border-border pt-3">
                      {m.permissions.map((p) => (
                        <li key={p.permission} className="flex items-start gap-2 text-xs">
                          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span>
                            <span className="font-mono">{p.permission}</span>
                            <span className="text-muted-foreground">
                              {" "}
                              — {p.reason} {p.required ? "(krävs)" : "(valfri)"}
                            </span>
                          </span>
                        </li>
                      ))}
                      {m.dependencies.length > 0 && (
                        <li className="text-xs text-muted-foreground">
                          Beroenden: {m.dependencies.map((d) => `${d.moduleId}@${d.range}`).join(", ")}
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="inline-flex items-start gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[oklch(0.75_0.1_165)]" />
        Moduler får aldrig automatisk åtkomst. Varje behörighet begärs explicit, isoleras från
        andra moduler och kan aldrig nå AI-nycklar eller systemhemligheter.
      </div>
    </div>
  );
}
