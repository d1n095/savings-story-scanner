import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft, Briefcase, ChevronRight, Plus, Star, Trash2, X, Check,
  Coffee, Sparkles, Sun, Moon, Calendar, Flag, Phone, Radio,
} from "lucide-react";
import { NumericField } from "@/components/ui/numeric-field";
import { QuickActionsBar } from "@/components/quick-actions-bar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { OBRule } from "@/modules/salary/ob";
import { DEFAULT_BREAK_RULES, normalizeBreakRules, type BreakRules } from "@/modules/salary/breaks";
import { currentPayPeriod, formatPayday } from "@/lib/pay-period";

export const Route = createFileRoute("/_app/installningar/lon-arbete")({ component: LonArbetePage });

type WorkProfile = {
  id: string;
  user_id: string;
  name: string;
  is_default: boolean;
  employer: string | null;
  workplace: string | null;
  occupation: string | null;
  hourly_rate: number | null;
  monthly_salary: number | null;
  tax_rate: number | null;
  ob_rules: OBRule[] | null;
  vacation_days_per_year: number | null;
  on_call_rate: number | null;
  standby_rate: number | null;
  break_rules: BreakRules | null;
  pension_pct: number | null;
  sick_pay_rate: number | null;
  vab_rate: number | null;
  per_diem: number | null;
  mileage_rate: number | null;
  period_start_day: number;
  payday_day: number;
  payday_offset_months: number;
};

/* ---------- OB presets ---------- */

type PresetKey = "kvall" | "natt" | "helg" | "rod" | "jour" | "beredskap";

const OB_PRESETS: Record<PresetKey, {
  label: string;
  icon: any;
  build: (value: number) => OBRule | { field: "on_call_rate" | "standby_rate"; value: number };
}> = {
  kvall: {
    label: "Kväll", icon: Moon,
    build: (v) => ({ id: crypto.randomUUID(), label: "Kväll (18–22)", days: [1,2,3,4,5], from: "18:00", to: "22:00", type: "amount", value: v }),
  },
  natt: {
    label: "Natt", icon: Moon,
    build: (v) => ({ id: crypto.randomUUID(), label: "Natt (22–06)", days: [0,1,2,3,4,5,6], from: "22:00", to: "06:00", type: "amount", value: v }),
  },
  helg: {
    label: "Helg", icon: Calendar,
    build: (v) => ({ id: crypto.randomUUID(), label: "Helg", days: [0,6], from: "00:00", to: "23:59", type: "amount", value: v }),
  },
  rod: {
    label: "Röd dag", icon: Flag,
    build: (v) => ({ id: crypto.randomUUID(), label: "Röd dag", days: [0,1,2,3,4,5,6], from: "00:00", to: "23:59", type: "percent", value: v, onlyRedDay: true }),
  },
  jour: {
    label: "Jour", icon: Phone,
    build: (v) => ({ field: "on_call_rate", value: v }),
  },
  beredskap: {
    label: "Beredskap", icon: Radio,
    build: (v) => ({ field: "standby_rate", value: v }),
  },
};

const PRESET_DEFAULTS: Record<PresetKey, { value: number; unit: "kr" | "%" }> = {
  kvall: { value: 25, unit: "kr" },
  natt: { value: 45, unit: "kr" },
  helg: { value: 40, unit: "kr" },
  rod: { value: 100, unit: "%" },
  jour: { value: 40, unit: "kr" },
  beredskap: { value: 20, unit: "kr" },
};

/* ============================================================== */
/*                             Page                                 */
/* ============================================================== */

function LonArbetePage() {
  const qc = useQueryClient();

  const profiles = useQuery({
    queryKey: ["work-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("work_profiles").select("*").order("is_default", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as WorkProfile[];
    },
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => {
    if (!selectedId && profiles.data?.length) setSelectedId(profiles.data[0].id);
  }, [profiles.data, selectedId]);

  const current = profiles.data?.find((p) => p.id === selectedId) ?? null;

  // Ingen profil alls? Kör wizard.
  const noProfile = profiles.isSuccess && (profiles.data?.length ?? 0) === 0;
  // Profil finns men saknar timlön → tydlig "Kom igång"-knapp.
  const emptyProfile = current && !current.hourly_rate && !current.monthly_salary;

  const [wizardOpen, setWizardOpen] = useState(false);
  useEffect(() => { if (noProfile) setWizardOpen(true); }, [noProfile]);

  return (
    <div className="space-y-6">
      <header>
        <Link to="/installningar" className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Inställningar
        </Link>
        <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Lön & Arbete</div>
        <h1 className="display text-3xl">Din lön</h1>
      </header>

      <QuickActionsBar />

      {noProfile && (
        <div className="glass rounded-3xl p-8 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[oklch(0.85_0.12_85/0.12)] text-[oklch(0.85_0.12_85)]">
            <Briefcase className="h-6 w-6" />
          </div>
          <h2 className="display mt-3 text-xl">Kom igång</h2>
          <p className="mt-1 text-sm text-muted-foreground">3 snabba frågor så räknar vi ut din lön automatiskt.</p>
          <button
            onClick={() => setWizardOpen(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-[oklch(0.88_0.1_85)] to-[oklch(0.7_0.12_75)] px-5 py-2.5 text-sm font-semibold text-background"
          >
            Starta guiden <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {current && (
        <>
          <ProfileSwitcher
            profiles={profiles.data ?? []}
            selectedId={current.id}
            onSelect={setSelectedId}
            onNew={() => setWizardOpen(true)}
          />

          {emptyProfile && (
            <button
              onClick={() => setWizardOpen(true)}
              className="flex w-full items-center justify-between rounded-2xl border border-dashed border-[oklch(0.78_0.105_85/0.4)] bg-[oklch(0.78_0.105_85/0.05)] px-4 py-4 text-left"
            >
              <div>
                <div className="text-sm font-medium">Fyll i din timlön</div>
                <div className="text-xs text-muted-foreground">3 snabba frågor så är du klar.</div>
              </div>
              <ChevronRight className="h-4 w-4 text-[oklch(0.85_0.12_85)]" />
            </button>
          )}

          <CardStack profile={current} onChange={() => qc.invalidateQueries({ queryKey: ["work-profiles"] })} />
        </>
      )}

      <SalaryWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        existingProfile={current}
        onDone={(id) => {
          setSelectedId(id);
          qc.invalidateQueries({ queryKey: ["work-profiles"] });
        }}
      />
    </div>
  );
}

/* ============================================================== */
/*                         Profile switcher                         */
/* ============================================================== */

function ProfileSwitcher({
  profiles, selectedId, onSelect, onNew,
}: {
  profiles: WorkProfile[];
  selectedId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);
  const current = profiles.find((p) => p.id === selectedId)!;
  if (profiles.length <= 1) {
    return (
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white/[0.02] px-3 py-1.5 text-xs text-muted-foreground">
          <Briefcase className="h-3 w-3" /> {current.name}
          {current.is_default && <Star className="h-3 w-3 text-[oklch(0.85_0.12_85)]" />}
        </div>
        <button onClick={onNew} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-white/[0.05]">
          <Plus className="h-3 w-3" /> Ny arbetsplats
        </button>
      </div>
    );
  }
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-2 rounded-full border border-border bg-white/[0.02] px-3 py-1.5 text-xs">
        <Briefcase className="h-3 w-3" /> <span className="font-medium">{current.name}</span>
        <ChevronRight className={cn("h-3 w-3 transition", open && "rotate-90")} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-64 overflow-hidden rounded-xl border border-border bg-surface/95 backdrop-blur-xl shadow-[0_12px_32px_-8px_rgba(0,0,0,0.6)]">
          {profiles.map((p) => (
            <button key={p.id} onClick={() => { onSelect(p.id); setOpen(false); }}
              className={cn("flex w-full items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-white/[0.05]",
                p.id === selectedId && "bg-[oklch(0.85_0.12_85/0.08)]")}>
              <span>{p.name}</span>
              {p.is_default && <Star className="h-3 w-3 text-[oklch(0.85_0.12_85)]" />}
            </button>
          ))}
          <button onClick={() => { setOpen(false); onNew(); }} className="flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-left text-sm text-muted-foreground hover:bg-white/[0.05] hover:text-foreground">
            <Plus className="h-3.5 w-3.5" /> Ny arbetsplats
          </button>
        </div>
      )}
    </div>
  );
}

/* ============================================================== */
/*                          Card stack                              */
/* ============================================================== */

function CardStack({ profile, onChange }: { profile: WorkProfile; onChange: () => void }) {
  const [sheet, setSheet] = useState<null | "wage" | "comp" | "breaks" | "vacation" | "advanced">(null);
  const rules: OBRule[] = (profile.ob_rules ?? []) as OBRule[];
  const compActive = rules.length + (profile.on_call_rate ? 1 : 0) + (profile.standby_rate ? 1 : 0);
  const wage = profile.hourly_rate
    ? `${profile.hourly_rate} kr/h`
    : profile.monthly_salary
      ? `${profile.monthly_salary.toLocaleString("sv-SE")} kr/mån`
      : "Inte satt";
  const br = normalizeBreakRules(profile.break_rules);
  const breaksLabel = br.mode === "off"
    ? "Ingen rast"
    : br.mode === "manual"
      ? "Jag lägger själv"
      : br.auto.length === 0
        ? "Automatisk"
        : `${br.auto[0].minutes} min efter ${br.auto[0].after_hours} h${br.auto.length > 1 ? ` +${br.auto.length - 1}` : ""}`;

  return (
    <div className="space-y-3">
      <StackCard
        label="Lön"
        value={wage}
        onClick={() => setSheet("wage")}
        highlight={!profile.hourly_rate && !profile.monthly_salary}
      />
      <StackCard
        label="Ersättningar"
        value={compActive === 0 ? "Ingen tillagd" : `${compActive} aktiv${compActive > 1 ? "a" : ""}`}
        onClick={() => setSheet("comp")}
        detail={renderCompSummary(rules, profile)}
      />
      <StackCard
        label="Raster"
        value={breaksLabel}
        onClick={() => setSheet("breaks")}
      />
      <StackCard
        label="Semester"
        value={profile.vacation_days_per_year ? `${profile.vacation_days_per_year} dagar/år` : "25 dagar/år"}
        onClick={() => setSheet("vacation")}
      />
      <button
        onClick={() => setSheet("advanced")}
        className="flex w-full items-center justify-between px-4 py-3 text-xs text-muted-foreground hover:text-foreground"
      >
        <span>Visa avancerat</span>
        <ChevronRight className="h-3.5 w-3.5" />
      </button>

      <WageSheet open={sheet === "wage"} onOpenChange={(o) => !o && setSheet(null)} profile={profile} onSaved={onChange} />
      <CompensationsSheet open={sheet === "comp"} onOpenChange={(o) => !o && setSheet(null)} profile={profile} onSaved={onChange} />
      <BreaksSheet open={sheet === "breaks"} onOpenChange={(o) => !o && setSheet(null)} profile={profile} onSaved={onChange} />
      <VacationSheet open={sheet === "vacation"} onOpenChange={(o) => !o && setSheet(null)} profile={profile} onSaved={onChange} />
      <AdvancedSheet open={sheet === "advanced"} onOpenChange={(o) => !o && setSheet(null)} profile={profile} onSaved={onChange} />
    </div>
  );
}

function renderCompSummary(rules: OBRule[], p: WorkProfile) {
  const parts: string[] = [];
  for (const r of rules.slice(0, 3)) {
    parts.push(`${r.label.split(" ")[0]} ${r.value}${r.type === "percent" ? "%" : " kr"}`);
  }
  if (p.on_call_rate) parts.push(`Jour ${p.on_call_rate} kr`);
  if (p.standby_rate) parts.push(`Beredskap ${p.standby_rate} kr`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

function StackCard({
  label, value, onClick, detail, highlight,
}: {
  label: string;
  value: string;
  onClick: () => void;
  detail?: string | null;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border bg-white/[0.02] px-4 py-4 text-left transition hover:bg-white/[0.04]",
        highlight ? "border-[oklch(0.78_0.105_85/0.5)] bg-[oklch(0.78_0.105_85/0.06)]" : "border-border",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-0.5 truncate text-base">{value}</div>
        {detail && <div className="mt-1 truncate text-xs text-muted-foreground">{detail}</div>}
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

/* ============================================================== */
/*                            Sheets                                */
/* ============================================================== */

function BaseSheet({ open, onOpenChange, title, children }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; children: React.ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto rounded-t-3xl border-border bg-surface/95 px-4 pb-8 backdrop-blur-xl sm:px-6">
        <SheetHeader className="mb-4">
          <SheetTitle className="display text-xl">{title}</SheetTitle>
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  );
}

/* ---------- Wage ---------- */

function WageSheet({ open, onOpenChange, profile, onSaved }: {
  open: boolean; onOpenChange: (o: boolean) => void; profile: WorkProfile; onSaved: () => void;
}) {
  const [mode, setMode] = useState<"hourly" | "monthly">(profile.monthly_salary && !profile.hourly_rate ? "monthly" : "hourly");
  const [hourly, setHourly] = useState<number | null>(profile.hourly_rate);
  const [monthly, setMonthly] = useState<number | null>(profile.monthly_salary);

  useEffect(() => {
    if (!open) return;
    setHourly(profile.hourly_rate); setMonthly(profile.monthly_salary);
    setMode(profile.monthly_salary && !profile.hourly_rate ? "monthly" : "hourly");
  }, [open, profile]);

  const save = useMutation({
    mutationFn: async () => {
      const patch = mode === "hourly"
        ? { hourly_rate: hourly, monthly_salary: null }
        : { hourly_rate: null, monthly_salary: monthly };
      const { error } = await supabase.from("work_profiles").update(patch).eq("id", profile.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Sparat"); onSaved(); onOpenChange(false); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <BaseSheet open={open} onOpenChange={onOpenChange} title="Lön">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <ToggleChip active={mode === "hourly"} onClick={() => setMode("hourly")}>Timlön</ToggleChip>
          <ToggleChip active={mode === "monthly"} onClick={() => setMode("monthly")}>Månadslön</ToggleChip>
        </div>
        {mode === "hourly" ? (
          <label className="block">
            <div className="mb-2 text-xs text-muted-foreground">Timlön</div>
            <NumericField value={hourly} onChange={setHourly} min={0} step={1} decimals={2} suffix="kr/h" placeholder="143" />
          </label>
        ) : (
          <label className="block">
            <div className="mb-2 text-xs text-muted-foreground">Månadslön</div>
            <NumericField value={monthly} onChange={setMonthly} min={0} step={100} decimals={0} suffix="kr/mån" placeholder="32 000" />
          </label>
        )}
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[oklch(0.88_0.1_85)] to-[oklch(0.7_0.12_75)] py-3 text-sm font-semibold text-background disabled:opacity-50"
        >
          <Check className="h-4 w-4" /> Klar
        </button>
      </div>
    </BaseSheet>
  );
}

function ToggleChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border px-3 py-2.5 text-sm transition",
        active
          ? "border-[oklch(0.78_0.105_85/0.5)] bg-[oklch(0.78_0.105_85/0.1)] text-foreground"
          : "border-border bg-white/[0.02] text-muted-foreground hover:text-foreground",
      )}
    >{children}</button>
  );
}

/* ---------- Compensations ---------- */

function CompensationsSheet({ open, onOpenChange, profile, onSaved }: {
  open: boolean; onOpenChange: (o: boolean) => void; profile: WorkProfile; onSaved: () => void;
}) {
  const [rules, setRules] = useState<OBRule[]>((profile.ob_rules ?? []) as OBRule[]);
  const [onCall, setOnCall] = useState<number | null>(profile.on_call_rate);
  const [standby, setStandby] = useState<number | null>(profile.standby_rate);
  const [picking, setPicking] = useState<PresetKey | null>(null);
  const [pickValue, setPickValue] = useState<number>(0);

  useEffect(() => {
    if (!open) return;
    setRules((profile.ob_rules ?? []) as OBRule[]);
    setOnCall(profile.on_call_rate); setStandby(profile.standby_rate);
    setPicking(null);
  }, [open, profile]);

  const save = useMutation({
    mutationFn: async (patch: Partial<WorkProfile>) => {
      const { error } = await supabase.from("work_profiles").update({
        ob_rules: patch.ob_rules !== undefined ? (patch.ob_rules as any) : (rules as any),
        on_call_rate: patch.on_call_rate !== undefined ? patch.on_call_rate : onCall,
        standby_rate: patch.standby_rate !== undefined ? patch.standby_rate : standby,
      }).eq("id", profile.id);
      if (error) throw error;
    },
    onSuccess: () => { onSaved(); },
    onError: (e: any) => toast.error(e.message),
  });

  function openPicker(k: PresetKey) {
    setPickValue(PRESET_DEFAULTS[k].value);
    setPicking(k);
  }

  function confirmPicker() {
    if (!picking) return;
    const built = OB_PRESETS[picking].build(pickValue);
    if ("field" in built) {
      if (built.field === "on_call_rate") { setOnCall(built.value); save.mutate({ on_call_rate: built.value }); }
      else { setStandby(built.value); save.mutate({ standby_rate: built.value }); }
    } else {
      const next = [...rules, built];
      setRules(next);
      save.mutate({ ob_rules: next });
    }
    toast.success("Tillagd");
    setPicking(null);
  }

  function removeRule(id: string) {
    const next = rules.filter((r) => r.id !== id);
    setRules(next); save.mutate({ ob_rules: next });
  }
  function removeOnCall() { setOnCall(null); save.mutate({ on_call_rate: null }); }
  function removeStandby() { setStandby(null); save.mutate({ standby_rate: null }); }

  const activeCards = [
    ...rules.map((r) => ({
      key: r.id, title: r.label,
      value: `${r.value}${r.type === "percent" ? "%" : " kr/h"}`,
      onDelete: () => removeRule(r.id),
    })),
    ...(onCall ? [{ key: "jour", title: "Jour", value: `${onCall} kr/h`, onDelete: removeOnCall }] : []),
    ...(standby ? [{ key: "beredskap", title: "Beredskap", value: `${standby} kr/h`, onDelete: removeStandby }] : []),
  ];

  return (
    <BaseSheet open={open} onOpenChange={onOpenChange} title="Ersättningar">
      {picking === null ? (
        <div className="space-y-5">
          {activeCards.length > 0 && (
            <div className="space-y-2">
              {activeCards.map((c) => (
                <div key={c.key} className="flex items-center justify-between rounded-2xl border border-border bg-white/[0.02] px-4 py-3">
                  <div>
                    <div className="text-sm">{c.title}</div>
                    <div className="text-xs text-muted-foreground">{c.value}</div>
                  </div>
                  <button onClick={c.onDelete} className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-[oklch(0.65_0.12_28/0.1)] hover:text-[oklch(0.7_0.12_28)]">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div>
            <div className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">Lägg till ersättning</div>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(OB_PRESETS) as PresetKey[]).map((k) => {
                const P = OB_PRESETS[k];
                const Icon = P.icon;
                return (
                  <button key={k} onClick={() => openPicker(k)}
                    className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-white/[0.02] p-3 text-xs transition hover:border-[oklch(0.78_0.105_85/0.4)] hover:bg-[oklch(0.78_0.105_85/0.06)]">
                    <Icon className="h-4 w-4 text-[oklch(0.85_0.12_85)]" />
                    <span>{P.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {activeCards.length === 0 && (
            <p className="text-xs text-muted-foreground">Tryck på en ersättning för att lägga till den.</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <button onClick={() => setPicking(null)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Tillbaka
          </button>
          <div className="rounded-2xl border border-border bg-white/[0.02] p-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{OB_PRESETS[picking].label}</div>
            <div className="mt-1 text-sm">Hur mycket får du extra?</div>
          </div>
          <NumericField
            value={pickValue}
            onChange={(v) => setPickValue(v ?? 0)}
            min={0}
            step={1}
            decimals={2}
            suffix={PRESET_DEFAULTS[picking].unit === "%" ? "%" : "kr/h"}
            placeholder={String(PRESET_DEFAULTS[picking].value)}
          />
          <button
            onClick={confirmPicker}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[oklch(0.88_0.1_85)] to-[oklch(0.7_0.12_75)] py-3 text-sm font-semibold text-background"
          >
            <Check className="h-4 w-4" /> Lägg till
          </button>
        </div>
      )}
    </BaseSheet>
  );
}

/* ---------- Breaks ---------- */

function BreaksSheet({ open, onOpenChange, profile, onSaved }: {
  open: boolean; onOpenChange: (o: boolean) => void; profile: WorkProfile; onSaved: () => void;
}) {
  const [rules, setRules] = useState<BreakRules>(normalizeBreakRules(profile.break_rules));
  useEffect(() => { if (open) setRules(normalizeBreakRules(profile.break_rules)); }, [open, profile]);

  const persist = useMutation({
    mutationFn: async (r: BreakRules) => {
      const { error } = await supabase.from("work_profiles").update({ break_rules: r as any }).eq("id", profile.id);
      if (error) throw error;
    },
    onSuccess: () => onSaved(),
    onError: (e: any) => toast.error(e.message),
  });

  function update(next: BreakRules) { setRules(next); persist.mutate(next); }

  function setMode(mode: BreakRules["mode"]) {
    const next: BreakRules = { ...rules, mode };
    if (mode === "auto" && next.auto.length === 0) next.auto = [...DEFAULT_BREAK_RULES.auto.slice(0, 1)];
    update(next);
  }

  function addRule() {
    const next: BreakRules = { ...rules, auto: [...rules.auto, { after_hours: 8, minutes: 45 }] };
    update(next);
  }
  function updateRule(i: number, patch: Partial<{ after_hours: number; minutes: number }>) {
    const next: BreakRules = { ...rules, auto: rules.auto.map((r, idx) => idx === i ? { ...r, ...patch } : r) };
    setRules(next); // debounce feels smoother — but simplest: save on blur via input
  }
  function commitRule() { persist.mutate(rules); }
  function removeRule(i: number) {
    const next: BreakRules = { ...rules, auto: rules.auto.filter((_, idx) => idx !== i) };
    update(next);
  }

  return (
    <BaseSheet open={open} onOpenChange={onOpenChange} title="Raster">
      <div className="space-y-5">
        <div className="text-sm text-muted-foreground">Hur fungerar dina raster?</div>
        <div className="space-y-2">
          <RadioRow label="Jag lägger rast själv" active={rules.mode === "manual"} onClick={() => setMode("manual")} />
          <RadioRow label="Automatisk" active={rules.mode === "auto"} onClick={() => setMode("auto")} />
          <RadioRow label="Ingen rast" active={rules.mode === "off"} onClick={() => setMode("off")} />
        </div>

        {rules.mode === "auto" && (
          <div className="space-y-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Regler</div>
            {rules.auto.map((r, i) => (
              <div key={i} className="rounded-2xl border border-border bg-white/[0.02] p-4">
                <div className="text-sm">
                  <span className="font-medium">{r.minutes || 0} minuters rast</span> efter{" "}
                  <span className="font-medium">{r.after_hours || 0} timmars</span> arbete.
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="block">
                    <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Efter timmar</div>
                    <input
                      type="number" inputMode="decimal" min={0} step={0.5}
                      value={r.after_hours}
                      onChange={(e) => updateRule(i, { after_hours: Number(e.target.value) || 0 })}
                      onBlur={commitRule}
                      className="w-full rounded-xl border border-border bg-background/50 px-3 py-2 text-sm outline-none focus:border-[oklch(0.78_0.105_85/0.5)]"
                    />
                  </label>
                  <label className="block">
                    <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Rast (min)</div>
                    <input
                      type="number" inputMode="numeric" min={0} step={5}
                      value={r.minutes}
                      onChange={(e) => updateRule(i, { minutes: Number(e.target.value) || 0 })}
                      onBlur={commitRule}
                      className="w-full rounded-xl border border-border bg-background/50 px-3 py-2 text-sm outline-none focus:border-[oklch(0.78_0.105_85/0.5)]"
                    />
                  </label>
                </div>
                <button onClick={() => removeRule(i)} className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-[oklch(0.7_0.12_28)]">
                  <Trash2 className="h-3 w-3" /> Ta bort
                </button>
              </div>
            ))}
            <button onClick={addRule} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-sm text-muted-foreground hover:border-[oklch(0.78_0.105_85/0.5)] hover:text-foreground">
              <Plus className="h-4 w-4" /> Lägg till ytterligare regel
            </button>
          </div>
        )}
      </div>
    </BaseSheet>
  );
}

function RadioRow({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition",
        active ? "border-[oklch(0.78_0.105_85/0.5)] bg-[oklch(0.78_0.105_85/0.08)]" : "border-border bg-white/[0.02] hover:bg-white/[0.04]",
      )}
    >
      <span className={cn("grid h-5 w-5 place-items-center rounded-full border", active ? "border-[oklch(0.85_0.12_85)]" : "border-border")}>
        {active && <span className="h-2 w-2 rounded-full bg-[oklch(0.85_0.12_85)]" />}
      </span>
      {label}
    </button>
  );
}

/* ---------- Vacation ---------- */

function VacationSheet({ open, onOpenChange, profile, onSaved }: {
  open: boolean; onOpenChange: (o: boolean) => void; profile: WorkProfile; onSaved: () => void;
}) {
  const [days, setDays] = useState<number | null>(profile.vacation_days_per_year ?? 25);
  useEffect(() => { if (open) setDays(profile.vacation_days_per_year ?? 25); }, [open, profile]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("work_profiles").update({ vacation_days_per_year: days }).eq("id", profile.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Sparat"); onSaved(); onOpenChange(false); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <BaseSheet open={open} onOpenChange={onOpenChange} title="Semester">
      <div className="space-y-4">
        <label className="block">
          <div className="mb-2 text-xs text-muted-foreground">Semesterdagar per år</div>
          <NumericField value={days} onChange={setDays} min={0} max={60} step={1} decimals={0} suffix="dagar" placeholder="25" />
        </label>
        <button onClick={() => save.mutate()} disabled={save.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[oklch(0.88_0.1_85)] to-[oklch(0.7_0.12_75)] py-3 text-sm font-semibold text-background disabled:opacity-50">
          <Check className="h-4 w-4" /> Klar
        </button>
      </div>
    </BaseSheet>
  );
}

/* ---------- Advanced ---------- */

function AdvancedSheet({ open, onOpenChange, profile, onSaved }: {
  open: boolean; onOpenChange: (o: boolean) => void; profile: WorkProfile; onSaved: () => void;
}) {
  const qc = useQueryClient();
  const [p, setP] = useState<WorkProfile>(profile);
  useEffect(() => { if (open) setP(profile); }, [open, profile]);

  const periodPreview = useMemo(() => {
    try {
      return currentPayPeriod({
        periodStartDay: p.period_start_day ?? 1,
        paydayDay: p.payday_day ?? 25,
        paydayOffsetMonths: p.payday_offset_months ?? 1,
      });
    } catch {
      return null;
    }
  }, [p.period_start_day, p.payday_day, p.payday_offset_months]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("work_profiles").update({
        name: p.name, employer: p.employer, workplace: p.workplace, occupation: p.occupation,
        tax_rate: p.tax_rate, pension_pct: p.pension_pct,
        sick_pay_rate: p.sick_pay_rate, vab_rate: p.vab_rate,
        per_diem: p.per_diem, mileage_rate: p.mileage_rate,
        period_start_day: p.period_start_day ?? 1,
        payday_day: p.payday_day ?? 25,
        payday_offset_months: p.payday_offset_months ?? 1,
      }).eq("id", profile.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Sparat"); onSaved(); onOpenChange(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const setDefault = useMutation({
    mutationFn: async () => {
      await supabase.from("work_profiles").update({ is_default: false }).neq("id", profile.id);
      const { error } = await supabase.from("work_profiles").update({ is_default: true }).eq("id", profile.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Standard"); qc.invalidateQueries({ queryKey: ["work-profiles"] }); onOpenChange(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async () => {
      if (!confirm(`Ta bort "${p.name}"?`)) throw new Error("avbruten");
      const { error } = await supabase.from("work_profiles").delete().eq("id", profile.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Borttagen"); qc.invalidateQueries({ queryKey: ["work-profiles"] }); onOpenChange(false); },
    onError: (e: any) => { if (e.message !== "avbruten") toast.error(e.message); },
  });

  return (
    <BaseSheet open={open} onOpenChange={onOpenChange} title="Avancerat">
      <div className="space-y-4">
        <Text label="Namn på arbetsplats" value={p.name} onChange={(v) => setP({ ...p, name: v })} />
        <Text label="Arbetsgivare" value={p.employer ?? ""} onChange={(v) => setP({ ...p, employer: v || null })} />
        <Text label="Yrke" value={p.occupation ?? ""} onChange={(v) => setP({ ...p, occupation: v || null })} />
        <Row>
          <Num label="Skatt (%)" value={p.tax_rate} onChange={(v) => setP({ ...p, tax_rate: v })} max={70} suffix="%" />
          <Num label="Tjänstepension (%)" value={p.pension_pct} onChange={(v) => setP({ ...p, pension_pct: v })} max={50} step={0.5} suffix="%" />
        </Row>
        <Row>
          <Num label="Sjuklön (kr/h)" value={p.sick_pay_rate} onChange={(v) => setP({ ...p, sick_pay_rate: v })} suffix="kr" />
          <Num label="VAB (kr/h)" value={p.vab_rate} onChange={(v) => setP({ ...p, vab_rate: v })} suffix="kr" />
        </Row>
        <Row>
          <Num label="Traktamente (kr/dag)" value={p.per_diem} onChange={(v) => setP({ ...p, per_diem: v })} suffix="kr" />
          <Num label="Milersättning (kr/mil)" value={p.mileage_rate} onChange={(v) => setP({ ...p, mileage_rate: v })} suffix="kr" />
        </Row>

        <div className="rounded-2xl border border-border bg-card/50 p-4">
          <div className="mb-3 text-[11px] uppercase tracking-wider text-muted-foreground">Löneperiod & utbetalning</div>
          <Row>
            <Num label="Period börjar dag" value={p.period_start_day ?? 1} onChange={(v) => setP({ ...p, period_start_day: Math.min(28, Math.max(1, Math.round(Number(v ?? 1)))) })} min={1} max={28} step={1} suffix="" />
            <Num label="Löneutbetalning dag" value={p.payday_day ?? 25} onChange={(v) => setP({ ...p, payday_day: Math.min(31, Math.max(1, Math.round(Number(v ?? 25)))) })} min={1} max={31} step={1} suffix="" />
          </Row>
          <Row>
            <Num label="Månader efter period" value={p.payday_offset_months ?? 1} onChange={(v) => setP({ ...p, payday_offset_months: Math.min(3, Math.max(0, Math.round(Number(v ?? 1)))) })} min={0} max={3} step={1} suffix="mån" />
          </Row>
          {periodPreview && (
            <div className="mt-3 rounded-xl bg-white/[0.04] p-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Aktuell period:</span>{" "}
              {periodPreview.label} · Utbetalning {formatPayday(periodPreview.payday)}
            </div>
          )}
        </div>

        <button onClick={() => save.mutate()} disabled={save.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[oklch(0.88_0.1_85)] to-[oklch(0.7_0.12_75)] py-3 text-sm font-semibold text-background disabled:opacity-50">
          <Check className="h-4 w-4" /> Spara
        </button>

        <div className="flex items-center justify-between pt-2">
          {!profile.is_default ? (
            <button onClick={() => setDefault.mutate()} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <Star className="h-3 w-3" /> Gör till standard
            </button>
          ) : <span className="text-xs text-muted-foreground inline-flex items-center gap-1"><Star className="h-3 w-3 text-[oklch(0.85_0.12_85)]" /> Standard</span>}
          <button onClick={() => del.mutate()} className="inline-flex items-center gap-1.5 text-xs text-[oklch(0.7_0.12_28)] hover:opacity-80">
            <Trash2 className="h-3 w-3" /> Ta bort arbetsplats
          </button>
        </div>
      </div>
    </BaseSheet>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}
function Text({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <input value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border bg-background/50 px-3 py-2 text-sm outline-none focus:border-[oklch(0.78_0.105_85/0.5)]" />
    </label>
  );
}
function Num({ label, value, onChange, ...rest }: {
  label: string; value: number | null; onChange: (v: number | null) => void;
  min?: number; max?: number; step?: number; suffix?: string;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <NumericField value={value} onChange={onChange} {...rest} />
    </label>
  );
}

/* ============================================================== */
/*                       Salary Wizard (3 steps)                    */
/* ============================================================== */

function SalaryWizard({
  open, onOpenChange, existingProfile, onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  existingProfile: WorkProfile | null;
  onDone: (id: string) => void;
}) {
  // Om profil finns och saknar lön → guiden fyller den. Annars skapa ny.
  const isNew = !existingProfile || (existingProfile.hourly_rate == null && existingProfile.monthly_salary == null && existingProfile.name !== "Ny arbetsplats") ? !existingProfile : true;

  const [step, setStep] = useState(0);
  const [occupation, setOccupation] = useState(existingProfile?.occupation ?? "");
  const [workplace, setWorkplace] = useState(existingProfile?.name && existingProfile.name !== "Ny arbetsplats" ? existingProfile.name : "");
  const [mode, setMode] = useState<"hourly" | "monthly">("hourly");
  const [hourly, setHourly] = useState<number | null>(null);
  const [monthly, setMonthly] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setOccupation(existingProfile?.occupation ?? "");
    setWorkplace(existingProfile?.name && existingProfile.name !== "Ny arbetsplats" ? existingProfile.name : "");
    setHourly(existingProfile?.hourly_rate ?? null);
    setMonthly(existingProfile?.monthly_salary ?? null);
    setMode(existingProfile?.monthly_salary && !existingProfile.hourly_rate ? "monthly" : "hourly");
  }, [open, existingProfile]);

  const save = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const patch = {
        name: workplace || "Min arbetsplats",
        occupation: occupation || null,
        hourly_rate: mode === "hourly" ? hourly : null,
        monthly_salary: mode === "monthly" ? monthly : null,
      };
      // Uppdatera befintlig tom profil, annars skapa ny.
      const shouldUpdate = existingProfile && existingProfile.hourly_rate == null && existingProfile.monthly_salary == null;
      if (shouldUpdate && existingProfile) {
        const { error } = await supabase.from("work_profiles").update(patch).eq("id", existingProfile.id);
        if (error) throw error;
        return existingProfile.id;
      }
      const { data, error } = await supabase.from("work_profiles").insert({
        user_id: user!.id,
        ...patch,
        is_default: !existingProfile,
        tax_rate: 30,
        vacation_days_per_year: 25,
        break_rules: DEFAULT_BREAK_RULES as any,
        ob_rules: [] as any,
      }).select().single();
      if (error) throw error;
      return (data as any).id as string;
    },
    onSuccess: (id) => {
      toast.success("Klart");
      onDone(id);
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const canNext =
    (step === 0 && occupation.trim().length > 0) ||
    (step === 1 && workplace.trim().length > 0) ||
    (step === 2 && ((mode === "hourly" && (hourly ?? 0) > 0) || (mode === "monthly" && (monthly ?? 0) > 0)));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto rounded-t-3xl border-border bg-surface/95 px-4 pb-8 backdrop-blur-xl sm:px-6">
        <SheetHeader className="mb-4">
          <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Steg {step + 1} av 3</div>
          <SheetTitle className="display text-2xl">
            {step === 0 && "Vad jobbar du som?"}
            {step === 1 && "Vad heter arbetsplatsen?"}
            {step === 2 && "Timlön eller månadslön?"}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5">
          {step === 0 && (
            <input
              autoFocus
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              placeholder="t.ex. Undersköterska"
              className="w-full rounded-xl border border-border bg-background/50 px-4 py-3 text-base outline-none focus:border-[oklch(0.78_0.105_85/0.5)]"
            />
          )}
          {step === 1 && (
            <input
              autoFocus
              value={workplace}
              onChange={(e) => setWorkplace(e.target.value)}
              placeholder="t.ex. Securitas"
              className="w-full rounded-xl border border-border bg-background/50 px-4 py-3 text-base outline-none focus:border-[oklch(0.78_0.105_85/0.5)]"
            />
          )}
          {step === 2 && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <ToggleChip active={mode === "hourly"} onClick={() => setMode("hourly")}>Timlön</ToggleChip>
                <ToggleChip active={mode === "monthly"} onClick={() => setMode("monthly")}>Månadslön</ToggleChip>
              </div>
              {mode === "hourly" ? (
                <NumericField value={hourly} onChange={setHourly} min={0} step={1} decimals={2} suffix="kr/h" placeholder="143" />
              ) : (
                <NumericField value={monthly} onChange={setMonthly} min={0} step={100} decimals={0} suffix="kr/mån" placeholder="32 000" />
              )}
              <p className="text-xs text-muted-foreground">
                Resten fyller vi i åt dig med rimliga standardvärden (25 dagars semester, 30 % skatt, ingen automatisk rast).
                Du kan ändra allt efteråt.
              </p>
            </>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between gap-2">
          {step > 0 ? (
            <button onClick={() => setStep(step - 1)} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" /> Tillbaka
            </button>
          ) : <span />}
          {step < 2 ? (
            <button
              disabled={!canNext}
              onClick={() => setStep(step + 1)}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-[oklch(0.88_0.1_85)] to-[oklch(0.7_0.12_75)] px-6 py-2.5 text-sm font-semibold text-background disabled:opacity-40"
            >
              Nästa <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              disabled={!canNext || save.isPending}
              onClick={() => save.mutate()}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-[oklch(0.88_0.1_85)] to-[oklch(0.7_0.12_75)] px-6 py-2.5 text-sm font-semibold text-background disabled:opacity-40"
            >
              <Check className="h-4 w-4" /> Klar
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
