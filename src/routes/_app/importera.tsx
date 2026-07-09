import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Upload, Image as ImageIcon, X, Check, Loader2, ArrowLeft, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { parseScheduleImage } from "@/lib/schedule-ocr.functions";
import { cn } from "@/lib/utils";

type ParsedShift = {
  date: string;
  from: string;
  to: string;
  shift_type: "regular" | "waking_on_call" | "sleeping_on_call" | "standby";
  break_minutes: number;
  note: string;
  confidence: number;
};

const TYPE_LABEL: Record<ParsedShift["shift_type"], string> = {
  regular: "Vanligt",
  waking_on_call: "Vaken jour",
  sleeping_on_call: "Sovande jour",
  standby: "Beredskap",
};

export const Route = createFileRoute("/_app/importera")({
  head: () => ({
    meta: [
      { title: "Importera schema — My Money Master" },
      { name: "description", content: "Ladda upp en bild på ditt schema och lägg in alla pass automatiskt." },
    ],
  }),
  component: ImportSchedulePage,
});

function ImportSchedulePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const parse = useServerFn(parseScheduleImage);
  const [preview, setPreview] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedShift[]>([]);
  const [warning, setWarning] = useState<string | null>(null);

  const analyze = useMutation({
    mutationFn: async (dataUrl: string) => {
      const res = await parse({ data: { imageDataUrl: dataUrl } });
      return res;
    },
    onSuccess: (res) => {
      setRows(res.shifts);
      setWarning(res.warning ?? null);
      if (res.shifts.length > 0) toast.success(`Hittade ${res.shifts.length} pass`);
    },
    onError: (e: any) => toast.error(e.message ?? "Kunde inte tolka bilden"),
  });

  const save = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Ej inloggad");
      const { data: profiles } = await supabase
        .from("work_profiles")
        .select("*")
        .order("is_default", { ascending: false });
      const p: any = profiles?.[0] ?? {};

      const inserts = rows.map((r) => {
        const starts = new Date(`${r.date}T${r.from}:00`);
        let ends = new Date(`${r.date}T${r.to}:00`);
        if (ends <= starts) ends = new Date(ends.getTime() + 86400000);
        const totalH = (ends.getTime() - starts.getTime()) / 3600000;

        let hourlyRate: number | null = p.hourly_rate ?? null;
        let onCallHours: number | null = null;
        if (r.shift_type === "waking_on_call") {
          hourlyRate = p.waking_on_call_rate ?? p.on_call_rate ?? hourlyRate;
          onCallHours = totalH;
        } else if (r.shift_type === "sleeping_on_call") {
          hourlyRate = p.sleeping_on_call_rate ?? p.on_call_rate ?? hourlyRate;
          onCallHours = totalH;
        } else if (r.shift_type === "standby") {
          hourlyRate = p.standby_rate ?? hourlyRate;
          onCallHours = totalH;
        }

        return {
          user_id: user.id,
          work_profile_id: p.id ?? null,
          starts_at: starts.toISOString(),
          ends_at: ends.toISOString(),
          break_minutes: r.shift_type === "regular" ? r.break_minutes : 0,
          hourly_rate: hourlyRate,
          shift_type: r.shift_type,
          on_call_hours: onCallHours,
          notes: r.note || null,
        };
      });

      const { error } = await supabase.from("shifts").insert(inserts as any);
      if (error) throw error;
      return inserts.length;
    },
    onSuccess: (count) => {
      toast.success(`${count} pass sparade`);
      qc.invalidateQueries({ queryKey: ["shifts"] });
      qc.invalidateQueries({ queryKey: ["cal-shifts"] });
      navigate({ to: "/kalender" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  async function onFile(file: File) {
    const dataUrl = await fileToDataUrl(file);
    setPreview(dataUrl);
    setRows([]);
    setWarning(null);
    analyze.mutate(dataUrl);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 pb-24 pt-6 sm:pt-10">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate({ to: "/kalender" })}
          className="grid h-9 w-9 place-items-center rounded-full border border-border bg-white/[0.02] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl font-semibold">Importera schema</h1>
          <p className="text-sm text-muted-foreground">Ladda upp en bild — appen läser passen åt dig.</p>
        </div>
      </div>

      {!preview && (
        <label
          className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-border bg-white/[0.02] px-6 py-16 text-center transition hover:border-[oklch(0.78_0.105_85/0.5)] hover:bg-[oklch(0.78_0.105_85/0.04)]"
        >
          <div className="grid h-14 w-14 place-items-center rounded-full bg-[oklch(0.85_0.12_85/0.15)] text-[oklch(0.85_0.12_85)]">
            <Upload className="h-6 w-6" />
          </div>
          <div className="text-sm">
            <div className="font-medium">Välj bild eller ta foto</div>
            <div className="text-xs text-muted-foreground">PNG, JPG, HEIC eller screenshot av schemat</div>
          </div>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
          />
        </label>
      )}

      {preview && (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-black/40">
            <img src={preview} alt="Uppladdat schema" className="max-h-72 w-full object-contain" />
            <button
              type="button"
              onClick={() => { setPreview(null); setRows([]); setWarning(null); }}
              className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
              aria-label="Ta bort"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {analyze.isPending && (
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-white/[0.02] px-4 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-[oklch(0.85_0.12_85)]" />
              Läser schemat…
            </div>
          )}

          {warning && !analyze.isPending && (
            <div className="flex items-start gap-3 rounded-2xl border border-[oklch(0.7_0.15_25/0.3)] bg-[oklch(0.7_0.15_25/0.06)] px-4 py-3 text-sm">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[oklch(0.7_0.15_25)]" />
              <div>{warning}</div>
            </div>
          )}

          {rows.length > 0 && (
            <>
              <div className="space-y-2">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Hittade pass ({rows.length}) — kolla igenom och rätta vid behov
                </div>
                <div className="space-y-2">
                  {rows.map((r, i) => (
                    <ShiftRow
                      key={i}
                      row={r}
                      onChange={(next) => setRows((rs) => rs.map((x, j) => (j === i ? next : x)))}
                      onDelete={() => setRows((rs) => rs.filter((_, j) => j !== i))}
                    />
                  ))}
                </div>
              </div>

              <div className="sticky bottom-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => { setPreview(null); setRows([]); }}
                  className="rounded-xl border border-border bg-background/60 px-4 py-3 text-sm backdrop-blur"
                >
                  Avbryt
                </button>
                <button
                  type="button"
                  disabled={save.isPending}
                  onClick={() => save.mutate()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[oklch(0.88_0.1_85)] to-[oklch(0.7_0.12_75)] py-3 text-sm font-medium text-background disabled:opacity-60"
                >
                  {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Lägg in {rows.length} pass
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ShiftRow({
  row, onChange, onDelete,
}: {
  row: ParsedShift;
  onChange: (r: ParsedShift) => void;
  onDelete: () => void;
}) {
  const uncertain = row.confidence < 0.7;
  return (
    <div
      className={cn(
        "rounded-2xl border bg-white/[0.02] p-3",
        uncertain ? "border-[oklch(0.85_0.12_85/0.5)] bg-[oklch(0.85_0.12_85/0.05)]" : "border-border",
      )}
    >
      <div className="grid grid-cols-[1fr_auto] items-start gap-2">
        <div className="grid grid-cols-3 gap-2">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Datum
            <input
              type="date"
              value={row.date}
              onChange={(e) => onChange({ ...row, date: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border bg-background/50 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Från
            <input
              type="time"
              value={row.from}
              onChange={(e) => onChange({ ...row, from: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border bg-background/50 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Till
            <input
              type="time"
              value={row.to}
              onChange={(e) => onChange({ ...row, to: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border bg-background/50 px-2 py-1.5 text-sm"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"
          aria-label="Ta bort"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {(Object.keys(TYPE_LABEL) as ParsedShift["shift_type"][]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onChange({ ...row, shift_type: t })}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px]",
              row.shift_type === t
                ? "border-[oklch(0.78_0.105_85/0.6)] bg-[oklch(0.78_0.105_85/0.12)] text-foreground"
                : "border-border bg-white/[0.02] text-muted-foreground hover:text-foreground",
            )}
          >
            {TYPE_LABEL[t]}
          </button>
        ))}
        {row.shift_type === "regular" && (
          <label className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground">
            Rast
            <input
              type="number" min={0}
              value={row.break_minutes}
              onChange={(e) => onChange({ ...row, break_minutes: Math.max(0, Number(e.target.value) || 0) })}
              className="w-14 rounded-lg border border-border bg-background/50 px-2 py-1 text-xs"
            />
            min
          </label>
        )}
        {uncertain && (
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-[oklch(0.85_0.12_85)]">
            <AlertCircle className="h-3 w-3" /> Kontrollera
          </span>
        )}
      </div>
    </div>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// unused import silencer
void ImageIcon;
