import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Blocks,
  Check,
  Lock,
  ShieldCheck,
  HardDrive,
  Package,
  Sparkles,
  CircleSlash,
  AlertTriangle,
  Loader2,
  Power,
  PowerOff,
  Trash2,
  RefreshCw,
  History,
} from "lucide-react";
import { isApiCompatible, LIFEAPP_API_VERSION, type LifeModuleManifest } from "@/platform";
import type { ModuleUiState, ModuleView } from "@/platform/module-state";
import { useModuleAction, useModuleAudit, useModuleViews } from "@/hooks/use-modules";

export const Route = createFileRoute("/_app/tillagg")({
  head: () => ({
    meta: [
      { title: "Life Store — tillägg och moduler" },
      {
        name: "description",
        content: "Installera, aktivera och granska LifeApp-moduler och deras behörigheter.",
      },
      { property: "og:title", content: "Life Store — tillägg och moduler" },
      {
        property: "og:description",
        content: "Installera, aktivera och granska LifeApp-moduler och deras behörigheter.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LifeStore,
});

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

const STATE_LABEL: Record<ModuleUiState, string> = {
  enabled: "Aktiv",
  disabled: "Inaktiverad",
  available: "Tillgänglig",
  incompatible: "Kräver nyare LifeApp",
  blocked: "Blockerad av beroende",
  failed: "Trasig",
};

const STATE_CLASS: Record<ModuleUiState, string> = {
  enabled: "border-[oklch(0.75_0.1_165/0.4)] text-[oklch(0.75_0.1_165)]",
  disabled: "border-border text-muted-foreground",
  available: "border-border text-muted-foreground",
  incompatible: "border-border text-muted-foreground",
  blocked: "border-[oklch(0.8_0.15_75/0.4)] text-[oklch(0.85_0.12_85)]",
  failed: "border-[oklch(0.65_0.2_25/0.5)] text-[oklch(0.7_0.2_25)]",
};

function LifeStore() {
  const [tab, setTab] = useState<"installerade" | "tillgangliga">("installerade");
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const { data: views, isLoading, isError, error, refetch, isFetching } = useModuleViews();
  const { data: audit } = useModuleAudit(8);
  const action = useModuleAction();
  const pendingId = action.isPending ? action.variables?.moduleId : undefined;

  const list = useMemo(() => {
    const all = views ?? [];
    return all.filter((v) =>
      tab === "installerade"
        ? v.installed || v.state === "failed"
        : !v.installed && v.state !== "failed",
    );
  }, [views, tab]);

  return (
    <div className="space-y-8">
      <header>
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
          Life Store
        </div>
        <h1 className="display text-4xl">Tillägg</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          LifeApp är ett skal. Varje del — kalender, ekonomi, lön — är en modul som kan installeras,
          uppdateras och stängas av utan att påverka resten. Din data ligger kvar även om du stänger
          av en modul.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          LifeApp API {LIFEAPP_API_VERSION} · {(views ?? []).length} moduler i katalogen
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
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
        <button
          onClick={() => void refetch()}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} /> Uppdatera
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 rounded-3xl border border-border p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Hämtar dina moduler…
        </div>
      )}

      {isError && (
        <div className="rounded-3xl border border-[oklch(0.65_0.2_25/0.5)] bg-[oklch(0.65_0.2_25/0.08)] p-6 text-sm">
          <div className="flex items-center gap-2 text-[oklch(0.7_0.2_25)]">
            <AlertTriangle className="h-4 w-4" /> Kunde inte läsa modultillståndet
          </div>
          <p className="mt-1 text-muted-foreground">{(error as Error)?.message}</p>
          <button
            onClick={() => void refetch()}
            className="mt-3 rounded-full border border-border px-3 py-1.5 text-xs hover:text-foreground"
          >
            Försök igen
          </button>
        </div>
      )}

      {!isLoading && !isError && list.length === 0 && (
        <div className="rounded-3xl border border-border p-8 text-center text-sm text-muted-foreground">
          {tab === "installerade"
            ? "Du har inga installerade moduler."
            : "Alla tillgängliga moduler är redan installerade."}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {list.map((v: ModuleView) => {
          const m = v.manifest;
          const compatible = isApiCompatible(m);
          const open = openId === m.id;
          const busy = pendingId === m.id;
          return (
            <div
              key={m.id}
              className="rounded-3xl border border-border bg-white/[0.02] p-5 transition hover:border-[oklch(0.85_0.12_85/0.4)]"
            >
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[oklch(0.85_0.12_85/0.12)] text-[oklch(0.85_0.12_85)]">
                  {v.installed ? <Package className="h-5 w-5" /> : <Blocks className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="display text-lg">{m.name}</div>
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                      v{v.record?.version ?? m.version}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${STATE_CLASS[v.state]}`}
                    >
                      {v.state === "enabled" && <Check className="h-3 w-3" />}
                      {v.state === "failed" && <AlertTriangle className="h-3 w-3" />}
                      {STATE_LABEL[v.state]}
                    </span>
                    {v.required && (
                      <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                        Kärnmodul
                      </span>
                    )}
                    {m.firstParty && (
                      <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                        Förstaparts
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{m.description}</div>
                  {v.message && (
                    <div className="mt-1 text-xs text-[oklch(0.85_0.12_85)]">{v.message}</div>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5" /> {priceLabel(m)}
                    </span>
                    {m.estimatedStorageKb != null && (
                      <span className="inline-flex items-center gap-1">
                        <HardDrive className="h-3.5 w-3.5" /> ~
                        {Math.round(m.estimatedStorageKb / 100) / 10} MB
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      {compatible ? (
                        <>
                          <ShieldCheck className="h-3.5 w-3.5 text-[oklch(0.75_0.1_165)]" />{" "}
                          Kompatibel
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

                  {/* Åtgärder */}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {!v.installed && (
                      <button
                        disabled={busy || !compatible || v.state === "blocked"}
                        onClick={() => action.mutate({ action: "install", moduleId: m.id })}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[oklch(0.85_0.12_85/0.16)] px-3.5 py-1.5 text-xs text-[oklch(0.85_0.12_85)] transition hover:bg-[oklch(0.85_0.12_85/0.24)] disabled:opacity-40"
                      >
                        {busy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Blocks className="h-3.5 w-3.5" />
                        )}
                        Installera
                      </button>
                    )}
                    {v.installed && v.state !== "enabled" && (
                      <button
                        disabled={busy}
                        onClick={() => action.mutate({ action: "enable", moduleId: m.id })}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs transition hover:text-foreground disabled:opacity-40"
                      >
                        {busy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Power className="h-3.5 w-3.5" />
                        )}
                        Aktivera
                      </button>
                    )}
                    {v.installed && v.state === "enabled" && !v.required && (
                      <button
                        disabled={busy}
                        onClick={() => action.mutate({ action: "disable", moduleId: m.id })}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs text-muted-foreground transition hover:text-foreground disabled:opacity-40"
                      >
                        {busy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <PowerOff className="h-3.5 w-3.5" />
                        )}
                        Inaktivera
                      </button>
                    )}
                    {v.installed && !v.required && (
                      <button
                        disabled={busy}
                        onClick={() => setConfirmId(m.id)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs text-muted-foreground transition hover:text-[oklch(0.7_0.2_25)] disabled:opacity-40"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Avinstallera
                      </button>
                    )}
                    {v.required && (
                      <span className="text-[11px] text-muted-foreground">
                        Kärnmodul — kan inte stängas av eller avinstalleras.
                      </span>
                    )}
                  </div>

                  {confirmId === m.id && (
                    <div className="mt-3 rounded-2xl border border-[oklch(0.65_0.2_25/0.4)] bg-[oklch(0.65_0.2_25/0.06)] p-3 text-xs">
                      <div className="text-foreground">Avinstallera {m.name}?</div>
                      <p className="mt-1 text-muted-foreground">
                        Modulen försvinner från navigationen. Din sparade data raderas inte.
                      </p>
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => {
                            setConfirmId(null);
                            action.mutate({ action: "uninstall", moduleId: m.id });
                          }}
                          className="rounded-full bg-[oklch(0.65_0.2_25/0.2)] px-3 py-1 text-[oklch(0.75_0.18_25)]"
                        >
                          Ja, avinstallera
                        </button>
                        <button
                          onClick={() => setConfirmId(null)}
                          className="rounded-full border border-border px-3 py-1 text-muted-foreground"
                        >
                          Avbryt
                        </button>
                      </div>
                    </div>
                  )}

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
                          Beroenden:{" "}
                          {m.dependencies.map((d) => `${d.moduleId}@${d.range}`).join(", ")}
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

      {audit && audit.length > 0 && (
        <section className="rounded-3xl border border-border p-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <History className="h-3.5 w-3.5" /> Modullogg
          </div>
          <ul className="mt-3 space-y-1.5 text-xs">
            {audit.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-2 text-muted-foreground">
                <span className="font-mono text-foreground">{a.moduleId}</span>
                <span>{a.action}</span>
                <span
                  className={a.success ? "text-[oklch(0.75_0.1_165)]" : "text-[oklch(0.7_0.2_25)]"}
                >
                  {a.success ? "lyckades" : "misslyckades"}
                </span>
                <span>{new Date(a.createdAt).toLocaleString("sv-SE")}</span>
                {a.detail && <span className="truncate">· {a.detail}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="inline-flex items-start gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[oklch(0.75_0.1_165)]" />
        Moduler får aldrig automatisk åtkomst. Varje behörighet begärs explicit, isoleras från andra
        moduler och kan aldrig nå AI-nycklar eller systemhemligheter.
      </div>
    </div>
  );
}
