import { useRef } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Fri numerisk inmatning med valfria snabbknappar.
 * - Skriv valfritt belopp direkt (även decimal: 143 eller 143,50)
 * - Piltangenter ↑/↓ för +/- (steg = `step`)
 * - Snabbknappar (default +1/+5/+10)
 * - Klistra in stöds (filtrerar fram siffror + komma/punkt)
 */
export function NumericField({
  value,
  onChange,
  min,
  max,
  step = 1,
  decimals = 2,
  placeholder,
  suffix,
  quickSteps,
  showQuick = true,
  className,
  inputClassName,
  ariaLabel,
}: {
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  decimals?: number;
  placeholder?: string;
  suffix?: string;
  quickSteps?: number[];
  showQuick?: boolean;
  className?: string;
  inputClassName?: string;
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const display = value === null || value === undefined || Number.isNaN(value) ? "" : String(value);

  const clamp = (n: number) => {
    if (typeof min === "number" && n < min) n = min;
    if (typeof max === "number" && n > max) n = max;
    return Number(n.toFixed(decimals));
  };

  const parse = (raw: string): number | null => {
    if (raw.trim() === "") return null;
    const norm = raw.replace(/\s/g, "").replace(",", ".");
    const n = Number(norm);
    return Number.isFinite(n) ? n : null;
  };

  const bump = (delta: number) => {
    const cur = typeof value === "number" && !Number.isNaN(value) ? value : 0;
    onChange(clamp(cur + delta));
    ref.current?.focus();
  };

  const steps = quickSteps ?? [1, 5, 10];

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-stretch overflow-hidden rounded-lg border border-border bg-input/40 focus-within:border-[oklch(0.85_0.12_85/0.5)]">
        <button
          type="button"
          onClick={() => bump(-step)}
          className="grid w-9 place-items-center border-r border-border text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"
          aria-label="Minska"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <input
          ref={ref}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={display}
          placeholder={placeholder}
          aria-label={ariaLabel}
          onChange={(e) => {
            const v = e.target.value;
            // Tillåt tom, siffror, ett kommatecken/punkt, minus i början
            if (v === "" || /^-?\d*[.,]?\d*$/.test(v)) {
              onChange(parse(v));
            }
          }}
          onPaste={(e) => {
            const txt = e.clipboardData.getData("text");
            const n = parse(txt);
            if (n !== null) {
              e.preventDefault();
              onChange(clamp(n));
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp") { e.preventDefault(); bump(step); }
            else if (e.key === "ArrowDown") { e.preventDefault(); bump(-step); }
            else if (e.key === "PageUp") { e.preventDefault(); bump(step * 10); }
            else if (e.key === "PageDown") { e.preventDefault(); bump(-step * 10); }
          }}
          className={cn(
            "min-w-0 flex-1 bg-transparent px-3 py-2 text-right text-sm tabular-nums outline-none",
            inputClassName,
          )}
        />
        {suffix && (
          <span className="grid place-items-center border-l border-border bg-white/[0.02] px-2.5 text-xs text-muted-foreground">
            {suffix}
          </span>
        )}
        <button
          type="button"
          onClick={() => bump(step)}
          className="grid w-9 place-items-center border-l border-border text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"
          aria-label="Öka"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      {showQuick && (
        <div className="flex flex-wrap gap-1">
          {steps.map((s) => (
            <button
              key={`p${s}`}
              type="button"
              onClick={() => bump(s)}
              className="rounded-full border border-border bg-white/[0.02] px-2 py-0.5 text-[10px] tabular-nums text-muted-foreground hover:border-[oklch(0.85_0.12_85/0.4)] hover:text-[oklch(0.85_0.12_85)]"
            >+{s}</button>
          ))}
          {steps.map((s) => (
            <button
              key={`m${s}`}
              type="button"
              onClick={() => bump(-s)}
              className="rounded-full border border-border bg-white/[0.02] px-2 py-0.5 text-[10px] tabular-nums text-muted-foreground hover:border-[oklch(0.65_0.12_28/0.4)] hover:text-[oklch(0.7_0.12_28)]"
            >−{s}</button>
          ))}
        </div>
      )}
    </div>
  );
}
