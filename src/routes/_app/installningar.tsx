import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_OB_RULES, type OBRule } from "@/modules/salary/ob";
import { toast } from "sonner";
import { Plus, Trash2, Save, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_app/installningar")({ component: SettingsPage });

const DAYS = ["Sön","Mån","Tis","Ons","Tor","Fre","Lör"];

function SettingsPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [rate, setRate] = useState(0);
  const [tax, setTax] = useState(30);
  const [buf, setBuf] = useState(0);
  const [rules, setRules] = useState<OBRule[]>([]);

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
        display_name: name, hourly_rate: rate, tax_rate: tax, monthly_buffer_goal: buf, ob_rules: rules, onboarded: true,
      }).eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Sparat"); qc.invalidateQueries({ queryKey: ["profile"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  function addRule() {
    setRules(r => [...r, { id: crypto.randomUUID(), label: "Ny regel", days: [], from: "18:00", to: "22:00", type: "amount", value: 20 }]);
  }
  function updateRule(id: string, patch: Partial<OBRule>) {
    setRules(r => r.map(x => x.id === id ? { ...x, ...patch } : x));
  }
  function delRule(id: string) { setRules(r => r.filter(x => x.id !== id)); }

  return (
    <div className="space-y-8">
      <header>
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Inställningar</div>
        <h1 className="display text-4xl">Din profil & regler</h1>
      </header>

      <section className="glass rounded-3xl p-6">
        <h2 className="display mb-4 text-xl">Personligt</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <F label="Namn"><input value={name} onChange={e => setName(e.target.value)} className="inp" /></F>
          <F label="Timlön (kr)"><input type="number" min={0} value={rate} onChange={e => setRate(+e.target.value)} className="inp" /></F>
          <F label="Skattesats (%)"><input type="number" min={0} max={70} value={tax} onChange={e => setTax(+e.target.value)} className="inp" /></F>
          <F label="Buffertmål (kr/mån)"><input type="number" min={0} value={buf} onChange={e => setBuf(+e.target.value)} className="inp" /></F>
        </div>
      </section>

      <section className="glass rounded-3xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="display text-xl">OB-regler</h2>
            <p className="mt-1 text-xs text-muted-foreground">Bygg dina egna tillägg. Varje pass beräknas mot alla regler nedan.</p>
          </div>
          <button onClick={addRule} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:bg-white/[0.05]"><Plus className="h-4 w-4" /> Ny regel</button>
        </div>

        {rules.length === 0 && (
          <button onClick={() => setRules(DEFAULT_OB_RULES)} className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground hover:bg-white/[0.03] w-full">
            Använd Sveriges standardregler (kväll, natt, lördag, söndag/röd dag)
          </button>
        )}

        <ul className="space-y-3">
          {rules.map(r => (
            <li key={r.id} className="rounded-2xl border border-border bg-white/[0.02] p-4">
              <div className="grid gap-3 sm:grid-cols-12">
                <div className="sm:col-span-3"><F label="Namn"><input value={r.label} onChange={e => updateRule(r.id, { label: e.target.value })} className="inp" /></F></div>
                <div className="sm:col-span-2"><F label="Från"><input type="time" value={r.from} onChange={e => updateRule(r.id, { from: e.target.value })} className="inp" /></F></div>
                <div className="sm:col-span-2"><F label="Till"><input type="time" value={r.to} onChange={e => updateRule(r.id, { to: e.target.value })} className="inp" /></F></div>
                <div className="sm:col-span-2"><F label="Typ">
                  <select value={r.type} onChange={e => updateRule(r.id, { type: e.target.value as any })} className="inp">
                    <option value="amount">kr/timme</option>
                    <option value="percent">% av timlön</option>
                  </select>
                </F></div>
                <div className="sm:col-span-2"><F label="Värde"><input type="number" value={r.value} onChange={e => updateRule(r.id, { value: +e.target.value })} className="inp" /></F></div>
                <div className="flex items-end sm:col-span-1">
                  <button onClick={() => delRule(r.id)} className="ml-auto grid h-10 w-10 place-items-center rounded-lg hover:bg-white/[0.05] hover:text-[oklch(0.7_0.12_28)]"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="mt-3">
                <div className="mb-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">Veckodagar (tomt = alla)</div>
                <div className="flex flex-wrap gap-1.5">
                  {DAYS.map((d, i) => {
                    const active = r.days.includes(i);
                    return (
                      <button key={i} type="button" onClick={() => updateRule(r.id, { days: active ? r.days.filter(x => x !== i) : [...r.days, i] })}
                        className={`rounded-full border px-3 py-1 text-xs ${active ? "border-[oklch(0.78_0.105_85/0.5)] bg-[oklch(0.78_0.105_85/0.15)] text-[oklch(0.85_0.12_85)]" : "border-border hover:bg-white/[0.04]"}`}>
                        {d}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-xs">
                  <label className="flex items-center gap-1.5"><input type="checkbox" checked={!!r.onlyHelg} onChange={e => updateRule(r.id, { onlyHelg: e.target.checked })} className="accent-[oklch(0.78_0.105_85)]" /> Endast helg (söndag/röd dag)</label>
                  <label className="flex items-center gap-1.5"><input type="checkbox" checked={!!r.onlyRedDay} onChange={e => updateRule(r.id, { onlyRedDay: e.target.checked })} className="accent-[oklch(0.78_0.105_85)]" /> Endast röd dag</label>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 text-[oklch(0.75_0.1_165)]" /> Endast du kan läsa eller ändra denna data (RLS).</div>
        <button onClick={() => save.mutate()} disabled={save.isPending} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-[oklch(0.88_0.1_85)] to-[oklch(0.7_0.12_75)] px-6 py-2.5 text-sm font-semibold text-background disabled:opacity-50">
          <Save className="h-4 w-4" /> Spara
        </button>
      </div>

      <style>{`.inp { width:100%; background:transparent; outline:none; border:1px solid var(--color-border); padding:0.625rem 0.75rem; border-radius:0.75rem; font-size:0.875rem; }`}</style>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>{children}</label>;
}
