import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_OB_RULES, type OBRule } from "@/modules/salary/ob";
import { toast } from "sonner";
import { Plus, Trash2, Save, Star, ArrowLeft, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/installningar/lon-arbete")({ component: LonArbetePage });

const DAYS = ["Sön","Mån","Tis","Ons","Tor","Fre","Lör"];

type WorkProfile = {
  id: string; user_id: string; name: string; is_default: boolean;
  employer: string | null; workplace: string | null; occupation: string | null;
  collective_agreement: string | null;
  hourly_rate: number | null; monthly_salary: number | null; tax_rate: number | null;
  ob_rules: OBRule[] | null;
  vacation_days_per_year: number | null;
  vab_rate: number | null; sick_pay_rate: number | null;
  per_diem: number | null; mileage_rate: number | null; pension_pct: number | null;
};

function LonArbetePage() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const profiles = useQuery({
    queryKey: ["work-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("work_profiles").select("*").order("is_default", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as WorkProfile[];
    },
  });

  useEffect(() => {
    if (!selectedId && profiles.data && profiles.data.length > 0) setSelectedId(profiles.data[0].id);
  }, [profiles.data, selectedId]);

  const createProfile = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const isFirst = (profiles.data?.length ?? 0) === 0;
      const { data, error } = await supabase.from("work_profiles").insert({
        user_id: user!.id, name: "Ny arbetsplats",
        is_default: isFirst, ob_rules: DEFAULT_OB_RULES as any, hourly_rate: 0, tax_rate: 30,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (p) => { setSelectedId((p as any).id); qc.invalidateQueries({ queryKey: ["work-profiles"] }); toast.success("Profil skapad"); },
    onError: (e: any) => toast.error(e.message),
  });

  const current = profiles.data?.find(p => p.id === selectedId) ?? null;

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <Link to="/installningar" className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Inställningar
          </Link>
          <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Lön & Arbete</div>
          <h1 className="display text-3xl sm:text-4xl">Arbetsprofiler</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            En profil per arbetsgivare. Planeringen och lönekalkylen läser värdena härifrån.
          </p>
        </div>
        <button onClick={() => createProfile.mutate()} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[oklch(0.85_0.12_85)] to-[oklch(0.6_0.1_75)] px-4 py-2 text-sm font-semibold text-background">
          <Plus className="h-4 w-4" /> Ny profil
        </button>
      </header>

      {profiles.data && profiles.data.length === 0 && (
        <div className="glass rounded-3xl p-8 text-center">
          <Briefcase className="mx-auto h-8 w-8 text-[oklch(0.85_0.12_85)]" />
          <h2 className="display mt-3 text-xl">Ingen arbetsprofil ännu</h2>
          <p className="mt-1 text-sm text-muted-foreground">Skapa din första profil för att komma igång.</p>
          <button onClick={() => createProfile.mutate()} className="mt-4 rounded-full bg-gradient-to-r from-[oklch(0.85_0.12_85)] to-[oklch(0.6_0.1_75)] px-5 py-2 text-sm font-semibold text-background">
            Skapa profil
          </button>
        </div>
      )}

      {profiles.data && profiles.data.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
          <aside className="space-y-1">
            {profiles.data.map(p => (
              <button key={p.id} onClick={() => setSelectedId(p.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition",
                  p.id === selectedId ? "border-[oklch(0.85_0.12_85/0.5)] bg-[oklch(0.85_0.12_85/0.08)]" : "border-border hover:bg-white/[0.03]",
                )}>
                <div className="min-w-0">
                  <div className="truncate font-medium">{p.name}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{p.employer || "—"}</div>
                </div>
                {p.is_default && <Star className="h-3.5 w-3.5 text-[oklch(0.85_0.12_85)]" />}
              </button>
            ))}
          </aside>
          {current && <ProfileEditor key={current.id} initial={current} onSaved={() => qc.invalidateQueries({ queryKey: ["work-profiles"] })} />}
        </div>
      )}
    </div>
  );
}

function ProfileEditor({ initial, onSaved }: { initial: WorkProfile; onSaved: () => void }) {
  const qc = useQueryClient();
  const [p, setP] = useState<WorkProfile>(initial);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("work_profiles").update({
        name: p.name, employer: p.employer, workplace: p.workplace, occupation: p.occupation,
        collective_agreement: p.collective_agreement,
        hourly_rate: p.hourly_rate, monthly_salary: p.monthly_salary, tax_rate: p.tax_rate,
        ob_rules: p.ob_rules as any,
        vacation_days_per_year: p.vacation_days_per_year,
        vab_rate: p.vab_rate, sick_pay_rate: p.sick_pay_rate,
        per_diem: p.per_diem, mileage_rate: p.mileage_rate, pension_pct: p.pension_pct,
      }).eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Sparat"); onSaved(); },
    onError: (e: any) => toast.error(e.message),
  });

  const setDefault = useMutation({
    mutationFn: async () => {
      await supabase.from("work_profiles").update({ is_default: false }).neq("id", p.id);
      const { error } = await supabase.from("work_profiles").update({ is_default: true }).eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Standardprofil"); qc.invalidateQueries({ queryKey: ["work-profiles"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async () => {
      if (!confirm(`Ta bort profilen "${p.name}"?`)) throw new Error("avbruten");
      const { error } = await supabase.from("work_profiles").delete().eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Borttagen"); qc.invalidateQueries({ queryKey: ["work-profiles"] }); },
    onError: (e: any) => { if (e.message !== "avbruten") toast.error(e.message); },
  });

  const rules: OBRule[] = (p.ob_rules ?? []) as OBRule[];
  const setRules = (next: OBRule[]) => setP({ ...p, ob_rules: next });

  return (
    <div className="space-y-6">
      <Section title="Grund">
        <Grid>
          <F label="Profilnamn"><input value={p.name} onChange={e => setP({ ...p, name: e.target.value })} className={inp()} /></F>
          <F label="Arbetsgivare"><input value={p.employer ?? ""} onChange={e => setP({ ...p, employer: e.target.value })} className={inp()} /></F>
          <F label="Arbetsplats"><input value={p.workplace ?? ""} onChange={e => setP({ ...p, workplace: e.target.value })} className={inp()} /></F>
          <F label="Yrke"><input value={p.occupation ?? ""} onChange={e => setP({ ...p, occupation: e.target.value })} className={inp()} /></F>
          <F label="Kollektivavtal"><input value={p.collective_agreement ?? ""} onChange={e => setP({ ...p, collective_agreement: e.target.value })} className={inp()} /></F>
        </Grid>
      </Section>

      <Section title="Lön & skatt">
        <Grid>
          <F label="Timlön (kr)"><input type="number" value={p.hourly_rate ?? 0} onChange={e => setP({ ...p, hourly_rate: +e.target.value })} className={inp()} /></F>
          <F label="Månadslön (kr, valfritt)"><input type="number" value={p.monthly_salary ?? ""} onChange={e => setP({ ...p, monthly_salary: e.target.value === "" ? null : +e.target.value })} className={inp()} /></F>
          <F label="Skattesats (%)"><input type="number" value={p.tax_rate ?? 30} onChange={e => setP({ ...p, tax_rate: +e.target.value })} className={inp()} /></F>
          <F label="Semesterdagar/år"><input type="number" value={p.vacation_days_per_year ?? 25} onChange={e => setP({ ...p, vacation_days_per_year: +e.target.value })} className={inp()} /></F>
        </Grid>
      </Section>

      <Section title="OB-regler" extra={
        <button type="button" onClick={() => setRules(rules.length === 0 ? DEFAULT_OB_RULES : [...rules, { id: crypto.randomUUID(), label: "Ny regel", days: [], from: "18:00", to: "22:00", type: "amount", value: 20 }])}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-white/[0.05]"><Plus className="h-3 w-3" /> {rules.length === 0 ? "Ladda standard" : "Ny regel"}</button>
      }>
        {rules.length === 0 ? (
          <p className="text-sm text-muted-foreground">Inga OB-regler. Ladda Sveriges standard ovan eller skapa egna.</p>
        ) : (
          <ul className="space-y-2">
            {rules.map(r => (
              <li key={r.id} className="rounded-2xl border border-border bg-white/[0.02] p-3">
                <div className="grid gap-2 sm:grid-cols-12">
                  <div className="sm:col-span-3"><F label="Namn"><input value={r.label} onChange={e => setRules(rules.map(x => x.id === r.id ? { ...x, label: e.target.value } : x))} className={inp()} /></F></div>
                  <div className="sm:col-span-2"><F label="Från"><input type="time" value={r.from} onChange={e => setRules(rules.map(x => x.id === r.id ? { ...x, from: e.target.value } : x))} className={inp()} /></F></div>
                  <div className="sm:col-span-2"><F label="Till"><input type="time" value={r.to} onChange={e => setRules(rules.map(x => x.id === r.id ? { ...x, to: e.target.value } : x))} className={inp()} /></F></div>
                  <div className="sm:col-span-2"><F label="Typ">
                    <select value={r.type} onChange={e => setRules(rules.map(x => x.id === r.id ? { ...x, type: e.target.value as any } : x))} className={inp()}>
                      <option value="amount">kr/h</option><option value="percent">%</option>
                    </select>
                  </F></div>
                  <div className="sm:col-span-2"><F label="Värde"><input type="number" value={r.value} onChange={e => setRules(rules.map(x => x.id === r.id ? { ...x, value: +e.target.value } : x))} className={inp()} /></F></div>
                  <div className="flex items-end sm:col-span-1">
                    <button type="button" onClick={() => setRules(rules.filter(x => x.id !== r.id))} className="ml-auto grid h-9 w-9 place-items-center rounded-lg hover:bg-[oklch(0.65_0.12_28/0.1)] hover:text-[oklch(0.7_0.12_28)]"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {DAYS.map((d, i) => {
                    const active = r.days.includes(i);
                    return (
                      <button key={i} type="button" onClick={() => setRules(rules.map(x => x.id === r.id ? { ...x, days: active ? x.days.filter(z => z !== i) : [...x.days, i] } : x))}
                        className={cn("rounded-full border px-2.5 py-1 text-[11px]", active ? "border-[oklch(0.78_0.105_85/0.5)] bg-[oklch(0.78_0.105_85/0.15)] text-[oklch(0.85_0.12_85)]" : "border-border")}>{d}</button>
                    );
                  })}
                  <label className="ml-2 flex items-center gap-1 text-[11px]"><input type="checkbox" checked={!!r.onlyHelg} onChange={e => setRules(rules.map(x => x.id === r.id ? { ...x, onlyHelg: e.target.checked } : x))} /> helg</label>
                  <label className="flex items-center gap-1 text-[11px]"><input type="checkbox" checked={!!r.onlyRedDay} onChange={e => setRules(rules.map(x => x.id === r.id ? { ...x, onlyRedDay: e.target.checked } : x))} /> röd dag</label>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Ersättningar (valfritt)">
        <Grid>
          <F label="Sjuklön (kr/h)"><input type="number" value={p.sick_pay_rate ?? ""} onChange={e => setP({ ...p, sick_pay_rate: e.target.value === "" ? null : +e.target.value })} className={inp()} /></F>
          <F label="VAB (kr/h)"><input type="number" value={p.vab_rate ?? ""} onChange={e => setP({ ...p, vab_rate: e.target.value === "" ? null : +e.target.value })} className={inp()} /></F>
          <F label="Traktamente (kr/dag)"><input type="number" value={p.per_diem ?? ""} onChange={e => setP({ ...p, per_diem: e.target.value === "" ? null : +e.target.value })} className={inp()} /></F>
          <F label="Milersättning (kr/mil)"><input type="number" value={p.mileage_rate ?? ""} onChange={e => setP({ ...p, mileage_rate: e.target.value === "" ? null : +e.target.value })} className={inp()} /></F>
          <F label="Tjänstepension (%)"><input type="number" value={p.pension_pct ?? ""} onChange={e => setP({ ...p, pension_pct: e.target.value === "" ? null : +e.target.value })} className={inp()} /></F>
        </Grid>
      </Section>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <div className="flex items-center gap-2">
          {!p.is_default && (
            <button onClick={() => setDefault.mutate()} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs hover:bg-white/[0.05]">
              <Star className="h-3.5 w-3.5" /> Gör till standard
            </button>
          )}
          <button onClick={() => del.mutate()} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs text-[oklch(0.7_0.12_28)] hover:bg-[oklch(0.65_0.12_28/0.1)]">
            <Trash2 className="h-3.5 w-3.5" /> Ta bort
          </button>
        </div>
        <button onClick={() => save.mutate()} disabled={save.isPending}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[oklch(0.85_0.12_85)] to-[oklch(0.6_0.1_75)] px-6 py-2.5 text-sm font-semibold text-background disabled:opacity-50">
          <Save className="h-4 w-4" /> Spara profil
        </button>
      </div>
    </div>
  );
}

function Section({ title, extra, children }: { title: string; extra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="glass rounded-3xl p-5">
      <div className="mb-4 flex items-center justify-between"><h2 className="display text-lg">{title}</h2>{extra}</div>
      {children}
    </section>
  );
}
function Grid({ children }: { children: React.ReactNode }) { return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>; }
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>{children}</label>;
}
function inp() { return "w-full rounded-lg border border-border bg-input/40 px-3 py-2 text-sm outline-none focus:border-[oklch(0.85_0.12_85/0.5)]"; }
