import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Konsumentvänligt nummerfält.
 * Standardläget är alltid fri inmatning: skriv, markera, klistra in, decimaler.
 * Native-känsla: mushjul och piltangenter fungerar utan synlig stepper.
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
  const [draft, setDraft] = useState("");

  useEffect(() => {
    const next = value === null || value === undefined || Number.isNaN(value) ? "" : String(value);
    if (document.activeElement !== ref.current) setDraft(next);
  }, [value]);

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
    const next = clamp(cur + delta);
    setDraft(String(next));
    onChange(next);
    ref.current?.focus();
  };

  const steps = quickSteps ?? [1, 5, 10];

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex min-h-12 items-center overflow-hidden rounded-2xl border border-border bg-input/40 focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-ring/25">
        <input
          ref={ref}
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          max={max}
          autoComplete="off"
          value={draft}
          placeholder={placeholder}
          aria-label={ariaLabel}
          onChange={(e) => {
            const raw = e.target.value;
            setDraft(raw);
            const parsed = parse(raw);
            onChange(parsed === null ? null : clamp(parsed));
          }}
          onPaste={(e) => {
            const txt = e.clipboardData.getData("text");
            const n = parse(txt);
            if (n !== null) {
              e.preventDefault();
              const next = clamp(n);
              setDraft(String(next));
              onChange(next);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp") { e.preventDefault(); bump(step); }
            else if (e.key === "ArrowDown") { e.preventDefault(); bump(-step); }
            else if (e.key === "PageUp") { e.preventDefault(); bump(step * 10); }
            else if (e.key === "PageDown") { e.preventDefault(); bump(-step * 10); }
          }}
          className={cn(
            "number-input-no-spinner min-w-0 flex-1 bg-transparent px-4 py-3 text-base tabular-nums outline-none",
            inputClassName,
          )}
        />
        {suffix && (
          <span className="grid place-items-center border-l border-border bg-secondary/40 px-3 text-sm text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
      {showQuick && (
        <div className="flex flex-wrap gap-1.5">
          {steps.map((s) => (
            <button
              key={`p${s}`}
              type="button"
              onClick={() => bump(s)}
              className="rounded-full border border-border bg-secondary/30 px-3 py-1 text-xs tabular-nums text-muted-foreground transition hover:border-primary/50 hover:text-primary"
            >+{s}</button>
          ))}
        </div>
      )}
    </div>
  );
}
