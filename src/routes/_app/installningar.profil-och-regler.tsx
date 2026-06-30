import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_OB_RULES, type OBRule } from "@/modules/salary/ob";
import { NumericField } from "@/components/ui/numeric-field";
import { toast } from "sonner";
import { Briefcase, Check, ChevronLeft, ChevronRight, Clock, Moon, Plus, Save, ShieldCheck, Sparkles, Sun, Trash2, Zap } from "lucide-react";

export const Route = createFileRoute("/_app/installningar/profil-och-regler")({ component: SettingsPage });

const DAYS = ["Sön", "Mån", "Tis", "Ons", "Tor", "Fre", "Lör"];

type PresetId = "evening" | "night" | "weekend" | "red" | "oncall" | "standby";
type Builder = {
  step: "pick" | "pay";
  preset?: ObPreset;
  from: string;
  to: string;
  type: "amount" | "percent";
  value: number | null;
};

type ObPreset = {
  id: PresetId;
  label: string;
  short: string;
  from: string;
  to: string;
  days: number[];
  onlyHelg?: boolean;
  onlyRedDay?: boolean;
  type: "amount" | "percent";
  value: number;
  icon: typeof Sun;
};

const OB_PRESETS: ObPreset[] = [
  { id: "evening", label: "Kväll", short: "18:00–22:00", from: "18:00", to: "22:00", days: [1, 2, 3, 4, 5], type: "amount", value: 25, icon: Sun },
  { id: "night", label: "Natt", short: "22:00–06:00", from: "22:00", to: "06:00", days: [0, 1, 2, 3, 4, 5, 6], type: "amount", value: 45, icon: Moon },
  { id: "weekend", label: "Helg", short: "Lör–sön", from: "00:00", to: "23:59", days: [0, 6], type: "amount", value: 40, icon: Sparkles },
  { id: "red", label: "Röd dag", short: "Heldag", from: "00:00", to: "23:59", days: [], onlyRedDay: true, type: "percent", value: 100, icon: Sparkles },
  { id: "oncall", label: "Jour", short: "00:00–23:59", from: "00:00", to: "23:59", days: [], type: "amount", value: 35, icon: Zap },
  { id: "standby", label: "Beredskap", short: "00:00–23:59", from: "00:00", to: "23:59", days: [], type: "amount", value: 20, icon: Clock },
];

function clonePreset(preset: ObPreset, value = preset.value): OBRule {
  return {
    id: crypto.randomUUID(),
    label: preset.label,
    days: preset.days,
    from: preset.from,
    to: preset.to,
    type: preset.type,
    value,
    onlyHelg: preset.onlyHelg,
    onlyRedDay: preset.onlyRedDay,
  };
}

function describeRule(rule: Pick<OBRule, "days" | "from" | "to" | "type" | "value" | "onlyHelg" | "onlyRedDay">) {
  const when = rule.onlyRedDay
    ? "Röda dagar"
    : rule.onlyHelg
      ? "Söndag och röda dagar"
      : rule.days?.length
        ? rule.days.map((day) => DAYS[day]).join(", ")
        : "Alla dagar";
  const pay = rule.type === "percent" ? `+${rule.value}% av timlön` : `+${rule.value} kr/timme`;
  return { when, time: `${rule.from}–${rule.to}`, pay };
}

function SettingsPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [rate, setRate] = useState<number | null>(0);
  const [tax, setTax] = useState(30);
  const [buf, setBuf] = useState(0);
  const [rules, setRules] = useState<OBRule[]>([]);
  const [builder, setBuilder] = useState<Builder | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (!profile.data) return;
    setName(profile.data.display_name || "");
    setRate(Number(profile.data.hourly_rate ?? 0));
    setTax(Number(profile.data.tax_rate ?? 30));
    setBuf(Number(profile.data.monthly_buffer_goal ?? 0));
    setRules(((profile.data.ob_rules as OBRule[] | null) ?? []).length ? (profile.data.ob_rules as OBRule[]) : DEFAULT_OB_RULES);
  }, [profile.data]);

  const save = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("profiles").update({
        display_name: name,
        hourly_rate: Number(rate ?? 0),
        tax_rate: tax,
        monthly_buffer_goal: buf,
        ob_rules: rules,
        onboarded: true,
      }).eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Sparat"); qc.invalidateQueries({ queryKey: ["profile"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const builderPreview = useMemo(() => {
    if (!builder?.preset) return null;
    return describeRule({
      days: builder.preset.days,
      from: builder.from,
      to: builder.to,
      type: builder.type,
      value: Number(builder.value ?? 0),
      onlyHelg: builder.preset.onlyHelg,
      onlyRedDay: builder.preset.onlyRedDay,
    });
  }, [builder]);

  function openPreset(preset: ObPreset) {
    setBuilder({
      step: "pay",
      preset,
      from: preset.from,
      to: preset.to,
      type: preset.type,
      value: preset.value,
    });
  }

  function addPreset(preset: ObPreset) {
    setRules((current) => [...current, clonePreset(preset)]);
    toast.success(`${preset.label} tillagd`);
  }

  function finishBuilder() {
    if (!builder?.preset) return;
    const preset = builder.preset;
    setRules((current) => [
      ...current,
      {
        ...clonePreset(preset, Number(builder.value ?? 0)),
        from: builder.from,
        to: builder.to,
        type: builder.type,
      },
    ]);
    toast.success("OB-regel tillagd");
    setBuilder(null);
  }

  function updateRule(id: string, patch: Partial<OBRule>) {
    setRules((current) => current.map((rule) => rule.id === id ? { ...rule, ...patch } : rule));
  }

  function delRule(id: string) {
    setRules((current) => current.filter((rule) => rule.id !== id));
  }

  return (
    <div className="space-y-8">
      <header>
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Inställningar</div>
        <h1 className="display text-4xl">Din profil & regler</h1>
      </header>

      <Link to="/installningar/lon-arbete"
        className="group flex items-center justify-between rounded-3xl border border-hairline bg-primary/5 p-5 transition hover:border-primary/50">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/15">
            <Briefcase className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="display text-lg">Lön & Arbete</div>
            <div className="text-xs text-muted-foreground">Arbetsprofiler, timlön, OB, skatt, semester, ersättningar</div>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
      </Link>

      <section className="glass rounded-3xl p-6">
        <h2 className="display mb-4 text-xl">Personligt (standardvärden)</h2>
        <div className="grid gap-4 lg:grid-cols-4">
          <F label="Namn"><input value={name} onChange={e => setName(e.target.value)} className="inp" /></F>
          <div className="lg:col-span-2">
            <F label="Timlön">
              <NumericField
                value={rate}
                onChange={setRate}
                min={0}
                step={1}
                suffix="kr/timme"
                quickSteps={[1, 5, 10]}
                placeholder="143"
                ariaLabel="Timlön"
              />
            </F>
          </div>
          <F label="Skattesats (%)"><input type="number" min={0} max={70} value={tax} onChange={e => setTax(+e.target.value)} className="inp" /></F>
          <F label="Buffertmål (kr/mån)"><input type="number" min={0} value={buf} onChange={e => setBuf(+e.target.value)} className="inp" /></F>
        </div>
      </section>

      <section className="glass rounded-3xl p-6">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="display text-xl">OB-regler</h2>
            <p className="mt-1 text-xs text-muted-foreground">Välj en mall. Appen fyller i resten.</p>
          </div>
          <button onClick={() => setBuilder({ step: "pick", from: "18:00", to: "22:00", type: "amount", value: 25 })} className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90">
            <Plus className="h-4 w-4" /> Lägg till OB
          </button>
        </div>

        {builder && (
          <div className="mb-5 rounded-3xl border border-hairline bg-elevated/70 p-4">
            {builder.step === "pick" && (
              <div className="space-y-4">
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Steg 1</div>
                  <h3 className="display text-2xl">Vad vill du lägga till?</h3>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {OB_PRESETS.map((preset) => <PresetButton key={preset.id} preset={preset} onClick={() => openPreset(preset)} />)}
                </div>
              </div>
            )}

            {builder.step === "pay" && builder.preset && builderPreview && (
              <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
                <div className="space-y-4">
                  <button onClick={() => setBuilder({ ...builder, step: "pick" })} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                    <ChevronLeft className="h-4 w-4" /> Tillbaka
                  </button>
                  <div>
                    <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Steg 2</div>
                    <h3 className="display text-2xl">Vilken ersättning?</h3>
                  </div>
                  <NumericField
                    value={builder.value}
                    onChange={(value) => setBuilder({ ...builder, value })}
                    min={0}
                    step={1}
                    suffix={builder.type === "amount" ? "kr/timme" : "%"}
                    quickSteps={[1, 5, 10]}
                    ariaLabel="OB-ersättning"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <F label="Från"><input type="time" value={builder.from} onChange={(e) => setBuilder({ ...builder, from: e.target.value })} className="inp" /></F>
                    <F label="Till"><input type="time" value={builder.to} onChange={(e) => setBuilder({ ...builder, to: e.target.value })} className="inp" /></F>
                  </div>
                </div>
                <div className="rounded-3xl border border-border bg-card p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/15 text-primary"><builder.preset.icon className="h-5 w-5" /></div>
                    <div>
                      <div className="display text-xl">{builder.preset.label}</div>
                      <div className="text-xs text-muted-foreground">Förhandsvisning</div>
                    </div>
                  </div>
                  <PreviewLine label="Denna regel gäller" value={builderPreview.when} />
                  <PreviewLine label="Tid" value={builderPreview.time} />
                  <PreviewLine label="Ersättning" value={builderPreview.pay} strong />
                  <button onClick={finishBuilder} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90">
                    <Check className="h-4 w-4" /> Klart
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="display text-lg">Färdiga mallar</h3>
            <button onClick={() => setRules(DEFAULT_OB_RULES)} className="text-xs text-muted-foreground hover:text-primary">Sveriges standard</button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {OB_PRESETS.map((preset) => (
              <TemplateCard key={preset.id} preset={preset} onAdd={() => addPreset(preset)} />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {rules.length === 0 && (
            <div className="rounded-3xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Inga regler än. Tryck på en mall eller “Lägg till OB”.
            </div>
          )}

          {rules.map((rule) => {
            const preview = describeRule(rule);
            return (
              <div key={rule.id} className="rounded-3xl border border-border bg-card p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="display text-xl">{rule.label}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{preview.when} · {preview.time} · {preview.pay}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input type="time" value={rule.from} onChange={(e) => updateRule(rule.id, { from: e.target.value })} className="mini-inp" aria-label={`${rule.label} från`} />
                    <input type="time" value={rule.to} onChange={(e) => updateRule(rule.id, { to: e.target.value })} className="mini-inp" aria-label={`${rule.label} till`} />
                    <div className="w-36"><NumericField value={rule.value} onChange={(value) => updateRule(rule.id, { value: Number(value ?? 0) })} min={0} step={1} suffix={rule.type === "amount" ? "kr" : "%"} showQuick={false} ariaLabel={`${rule.label} ersättning`} /></div>
                    <button onClick={() => delRule(rule.id)} className="grid h-11 w-11 place-items-center rounded-full border border-border text-muted-foreground transition hover:border-destructive/50 hover:text-destructive" aria-label={`Ta bort ${rule.label}`}><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>

                {advancedOpen && (
                  <div className="mt-4 border-t border-border pt-4">
                    <div className="grid gap-3 lg:grid-cols-12">
                      <div className="lg:col-span-3"><F label="Namn"><input value={rule.label} onChange={(e) => updateRule(rule.id, { label: e.target.value })} className="inp" /></F></div>
                      <div className="lg:col-span-2"><F label="Typ"><select value={rule.type} onChange={(e) => updateRule(rule.id, { type: e.target.value as OBRule["type"] })} className="inp"><option value="amount">kr/timme</option><option value="percent">% av timlön</option></select></F></div>
                      <div className="lg:col-span-7">
                        <div className="mb-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">Veckodagar</div>
                        <div className="flex flex-wrap gap-1.5">
                          {DAYS.map((day, index) => {
                            const active = rule.days.includes(index);
                            return (
                              <button key={index} type="button" onClick={() => updateRule(rule.id, { days: active ? rule.days.filter((x) => x !== index) : [...rule.days, index] })}
                                className={`rounded-full border px-3 py-1 text-xs transition ${active ? "border-primary/50 bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
                                {day}
                              </button>
                            );
                          })}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <label className="flex items-center gap-1.5"><input type="checkbox" checked={!!rule.onlyHelg} onChange={(e) => updateRule(rule.id, { onlyHelg: e.target.checked })} className="accent-primary" /> Söndag/röd dag</label>
                          <label className="flex items-center gap-1.5"><input type="checkbox" checked={!!rule.onlyRedDay} onChange={(e) => updateRule(rule.id, { onlyRedDay: e.target.checked })} className="accent-primary" /> Endast röd dag</label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button onClick={() => setAdvancedOpen((open) => !open)} className="mt-5 text-sm text-muted-foreground hover:text-primary">
          {advancedOpen ? "Dölj avancerade regler" : "Avancerade regler"}
        </button>
      </section>

      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 text-emerald" /> Endast du kan läsa eller ändra denna data.</div>
        <button onClick={() => save.mutate()} disabled={save.isPending} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          <Save className="h-4 w-4" /> Spara
        </button>
      </div>

      <style>{`.inp { width:100%; background:transparent; outline:none; border:1px solid var(--color-border); padding:0.625rem 0.75rem; border-radius:0.875rem; font-size:0.875rem; min-height:2.75rem; } .mini-inp { width:6.25rem; background:var(--color-input); outline:none; border:1px solid var(--color-border); padding:0.65rem 0.75rem; border-radius:999px; font-size:0.875rem; }`}</style>
    </div>
  );
}

function F({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>{children}</label>;
}

function PresetButton({ preset, onClick }: { preset: ObPreset; onClick: () => void }) {
  const Icon = preset.icon;
  return (
    <button onClick={onClick} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition hover:border-primary/50 hover:bg-primary/5">
      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/15 text-primary"><Icon className="h-5 w-5" /></span>
      <span>
        <span className="block font-medium">{preset.label}</span>
        <span className="block text-xs text-muted-foreground">{preset.short}</span>
      </span>
    </button>
  );
}

function TemplateCard({ preset, onAdd }: { preset: ObPreset; onAdd: () => void }) {
  const Icon = preset.icon;
  const preview = describeRule(preset);
  return (
    <div className="rounded-3xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/15 text-primary"><Icon className="h-5 w-5" /></div>
        <div>
          <div className="font-medium">{preset.label}</div>
          <div className="text-xs text-muted-foreground">{preview.time}</div>
        </div>
      </div>
      <div className="text-xs text-muted-foreground">{preview.when} · {preview.pay}</div>
      <button onClick={onAdd} className="mt-4 inline-flex w-full items-center justify-center rounded-full border border-border py-2 text-sm transition hover:border-primary/50 hover:text-primary">Lägg till</button>
    </div>
  );
}

function PreviewLine({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between border-t border-border py-3 text-sm first:border-t-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-semibold text-primary" : "text-foreground"}>{value}</span>
    </div>
  );
}
