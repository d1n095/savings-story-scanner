import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Upload, Check, Loader2, AlertTriangle, FileText, TrendingUp, TrendingDown, Minus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { parsePayslipImage, type ParsedPayslip } from "@/lib/payslip-ocr.functions";
import { sek } from "@/lib/format";
import { getActiveWorkProfile } from "@/lib/active-work-profile";
import { currentPayPeriod, isInPeriod } from "@/lib/pay-period";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/lonspec")({
  head: () => ({
    meta: [
      { title: "Lonespec-scanner — My Money Master" },
      { name: "description", content: "Skanna din lönespecifikation och jämför mot appens beräkningar." },
    ],
  }),
  component: PayslipScannerPage,
});

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

type DiffRow = {
  label: string;
  computed: number | null;
  actual: number | null;
  diff: number | null;
};

function DiffCell({ value, diff }: { value: number | null; diff?: number | null }) {
  if (value === null) return <span className="text-muted-foreground/50">—</span>;
  return <span>{sek(value)}</span>;
}

function DiffBadge({ diff }: { diff: number | null }) {
  if (diff === null) return null;
  const abs = Math.abs(diff);
  if (abs < 1) return <span className="text-xs text-muted-foreground">OK</span>;
  const positive = diff > 0;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium",
      positive ? "text-green-400" : "text-red-400")}>
      {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {positive ? "+" : ""}{sek(diff)}
    </span>
  );
}

function PayslipScannerPage() {
  const qc = useQueryClient();
  const parse = useServerFn(parsePayslipImage);
  const [preview, setPreview] = useState<string | null>(null);
  const [payslip, setPayslip] = useState<ParsedPayslip | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const profile = useQuery({
    queryKey: ["wp-active"],
    queryFn: () => getActiveWorkProfile(),
  });

  const shifts = useQuery({
    queryKey: ["shifts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("shifts")
        .select("starts_at, ends_at, break_minutes, base_amount, ob_amount, total_amount, on_call_hours")
        .is("deleted_at", null)
        .order("starts_at", { ascending: false });
      return data ?? [];
    },
  });

  const savedPayslips = useQuery({
    queryKey: ["payslips"],
    queryFn: async () => {
      const { data } = await supabase
        .from("payslips")
        .select("*")
        .is("deleted_at", null)
        .order("period_start", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  const analyze = useMutation({
    mutationFn: async (dataUrl: string) => parse({ data: { imageDataUrl: dataUrl } }),
    onSuccess: (res) => {
      setPayslip(res.payslip);
      setWarning(res.warning ?? null);
      toast.success("Lönespec tolkad");
    },
    onError: (e: any) => toast.error(e.message ?? "Kunde inte tolka bilden"),
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!payslip) throw new Error("Ingen lönespec att spara");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Ej inloggad");
      const { error } = await supabase.from("payslips").insert({
        user_id: user.id,
        work_profile_id: profile.data?.id ?? null,
        period_start: payslip.period_start,
        period_end: payslip.period_end,
        gross_salary: payslip.gross_salary,
        net_salary: payslip.net_salary,
        tax_amount: payslip.tax_amount,
        ob_amount: payslip.ob_amount,
        on_call_amount: payslip.on_call_amount,
        vacation_pay: payslip.vacation_pay,
        overtime_amount: payslip.overtime_amount,
        total_hours: payslip.total_hours,
        ocr_raw: payslip.ocr_raw,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lönespec sparad");
      qc.invalidateQueries({ queryKey: ["payslips"] });
      setPayslip(null);
      setPreview(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  async function onFile(file: File) {
    const dataUrl = await fileToDataUrl(file);
    setPreview(dataUrl);
    setPayslip(null);
    setWarning(null);
    analyze.mutate(dataUrl);
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }, []);

  // Build comparison rows when payslip is scanned
  const diffRows: DiffRow[] = [];
  if (payslip && profile.data) {
    const period = currentPayPeriod({
      periodStartDay: profile.data.periodStartDay,
      paydayDay: profile.data.paydayDay,
      paydayOffsetMonths: profile.data.paydayOffsetMonths,
    });
    const periodShifts = (shifts.data ?? []).filter((s: any) => isInPeriod(period, s.starts_at));
    const computedBase = periodShifts.reduce((sum: number, s: any) => sum + Number(s.base_amount || 0), 0);
    const computedOb = periodShifts.reduce((sum: number, s: any) => sum + Number(s.ob_amount || 0), 0);
    const computedGross = computedBase + computedOb;
    const vacPct = profile.data.vacationPayPercent / 100;
    const computedVac = +(computedGross * vacPct).toFixed(2);
    const taxRate = profile.data.taxRate / 100;
    const computedNet = +((computedGross + computedVac) * (1 - taxRate)).toFixed(2);

    diffRows.push(
      { label: "Bruttolön", computed: computedGross, actual: payslip.gross_salary, diff: payslip.gross_salary != null ? +(payslip.gross_salary - computedGross).toFixed(2) : null },
      { label: "Nettolön", computed: computedNet, actual: payslip.net_salary, diff: payslip.net_salary != null ? +(payslip.net_salary - computedNet).toFixed(2) : null },
      { label: "OB-tillägg", computed: computedOb, actual: payslip.ob_amount, diff: payslip.ob_amount != null ? +(payslip.ob_amount - computedOb).toFixed(2) : null },
      { label: "Semesterersättning", computed: computedVac, actual: payslip.vacation_pay, diff: payslip.vacation_pay != null ? +(payslip.vacation_pay - computedVac).toFixed(2) : null },
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Lönespec-scanner</div>
        <h1 className="display text-4xl">Skanna lönespec</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ladda upp din lönespecifikation — appen jämför mot sin egen beräkning och visar avvikelser.
        </p>
      </header>

      {/* Upload zone */}
      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        className="relative flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-border bg-card/30 p-10 text-center transition hover:border-muted-foreground/40"
      >
        <input
          type="file"
          accept="image/*,application/pdf"
          className="absolute inset-0 cursor-pointer opacity-0"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
        />
        {analyze.isPending ? (
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        ) : (
          <Upload className="h-8 w-8 text-muted-foreground" />
        )}
        <p className="text-sm text-muted-foreground">
          {analyze.isPending ? "Tolkar lönespecen…" : "Dra in bild eller klicka för att välja"}
        </p>
      </div>

      {warning && (
        <div className="flex items-start gap-3 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {warning}
        </div>
      )}

      {/* Comparison result */}
      {payslip && (
        <div className="space-y-4">
          <div className="glass rounded-3xl p-6">
            <h2 className="display text-xl">Jämförelse med appens beräkning</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Period {payslip.period_start} – {payslip.period_end}
              {payslip.employer && ` · ${payslip.employer}`}
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="pb-2 text-left">Post</th>
                    <th className="pb-2 text-right">App beräknat</th>
                    <th className="pb-2 text-right">Lönespec</th>
                    <th className="pb-2 text-right">Diff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {diffRows.map((row) => (
                    <tr key={row.label} className="py-2">
                      <td className="py-2 font-medium">{row.label}</td>
                      <td className="py-2 text-right text-muted-foreground">
                        <DiffCell value={row.computed} />
                      </td>
                      <td className="py-2 text-right">
                        <DiffCell value={row.actual} />
                      </td>
                      <td className="py-2 text-right">
                        <DiffBadge diff={row.diff} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[oklch(0.88_0.1_85)] to-[oklch(0.7_0.12_75)] py-3 text-sm font-semibold text-background disabled:opacity-50"
          >
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Spara lönespec
          </button>
        </div>
      )}

      {/* Saved payslip history */}
      {(savedPayslips.data ?? []).length > 0 && (
        <div className="glass rounded-3xl p-6">
          <h2 className="display text-xl">Sparade lönespecar</h2>
          <ul className="mt-4 divide-y divide-border">
            {(savedPayslips.data ?? []).map((p: any) => (
              <li key={p.id} className="flex items-center justify-between py-3 text-sm">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>{p.period_start} – {p.period_end}</span>
                </div>
                <div className="flex items-center gap-4 text-right">
                  {p.net_salary != null && <span className="font-medium">{sek(p.net_salary)}</span>}
                  {p.verified_at && <Check className="h-3 w-3 text-green-400" />}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
