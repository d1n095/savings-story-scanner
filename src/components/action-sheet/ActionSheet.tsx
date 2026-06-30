import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Plus, ArrowLeft, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ACTIONS, CATEGORY_META, actionsByCategory,
  type Action, type ActionCategory,
} from "./actions";
import { ShiftFlow } from "./flows/shift-flow";
import { ExpenseFlow } from "./flows/expense-flow";
import { AbsenceFlow } from "./flows/vacation-flow";
import { ReminderFlow } from "./flows/reminder-flow";

type Step =
  | { kind: "root" }
  | { kind: "category"; cat: ActionCategory }
  | { kind: "flow"; action: Action };

const CATEGORIES = Object.entries(CATEGORY_META) as Array<[ActionCategory, typeof CATEGORY_META[ActionCategory]]>;

export function ActionSheet({
  open, onOpenChange, defaultDate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultDate?: string;
}) {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>({ kind: "root" });
  const [query, setQuery] = useState("");

  // Reset on close
  useEffect(() => {
    if (!open) { setStep({ kind: "root" }); setQuery(""); }
  }, [open]);

  function handleAction(action: Action) {
    // Har egen inline-flow?
    const hasInline = ["shift", "expense", "reminder", "vacation", "sick", "vab", "leave"].includes(action.key);
    if (hasInline) {
      setStep({ kind: "flow", action });
      return;
    }
    // Annars navigera till befintlig route
    if (action.route) {
      onOpenChange(false);
      navigate({ to: action.route as any, search: (action.routeSearch ?? {}) as any });
    }
  }

  // Sökresultat — global
  const searchResults = query.trim()
    ? ACTIONS.filter((a) =>
        a.label.toLowerCase().includes(query.toLowerCase()) ||
        CATEGORY_META[a.category].label.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[88vh] overflow-y-auto rounded-t-3xl border-border bg-surface/95 px-4 pb-6 backdrop-blur-xl sm:px-6"
      >
        <SheetHeader className="mb-3 flex flex-row items-center gap-2 space-y-0">
          {step.kind !== "root" && (
            <button
              onClick={() => setStep({ kind: "root" })}
              className="grid h-8 w-8 place-items-center rounded-full border border-border bg-white/[0.03] text-muted-foreground hover:text-foreground"
              aria-label="Tillbaka"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <SheetTitle className="display text-xl">
            {step.kind === "root" && "Vad vill du göra?"}
            {step.kind === "category" && CATEGORY_META[step.cat].label}
            {step.kind === "flow" && step.action.label}
          </SheetTitle>
        </SheetHeader>

        {step.kind === "root" && (
          <div className="space-y-5">
            {/* Sök */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Sök handling…"
                className="w-full rounded-xl border border-border bg-background/50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[oklch(0.78_0.105_85/0.5)]"
              />
            </div>

            {searchResults.length > 0 ? (
              <div className="space-y-1">
                {searchResults.map((a) => {
                  const Icon = a.icon;
                  return (
                    <button
                      key={a.key}
                      onClick={() => handleAction(a)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-white/[0.04]"
                    >
                      <div className="grid h-9 w-9 place-items-center rounded-lg bg-[oklch(0.85_0.12_85/0.12)] text-[oklch(0.85_0.12_85)]">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm">{a.label}</div>
                        <div className="text-[11px] text-muted-foreground">{CATEGORY_META[a.category].emoji} {CATEGORY_META[a.category].label}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {CATEGORIES.map(([key, meta]) => (
                  <button
                    key={key}
                    onClick={() => setStep({ kind: "category", cat: key })}
                    className={cn(
                      "flex w-full items-center justify-between rounded-2xl border border-border bg-white/[0.02] px-4 py-4 text-left transition",
                      "hover:border-[oklch(0.78_0.105_85/0.4)] hover:bg-[oklch(0.78_0.105_85/0.06)]",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{meta.emoji}</span>
                      <span className="text-sm font-medium">{meta.label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{actionsByCategory(key).length} val</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {step.kind === "category" && (
          <div className="grid grid-cols-3 gap-2 pt-1 sm:grid-cols-4">
            {actionsByCategory(step.cat).map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.key}
                  onClick={() => handleAction(a)}
                  className="group flex flex-col items-center gap-2 rounded-2xl border border-border bg-white/[0.02] p-4 transition hover:border-[oklch(0.78_0.105_85/0.5)] hover:bg-[oklch(0.78_0.105_85/0.08)]"
                >
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-[oklch(0.85_0.12_85/0.12)] text-[oklch(0.85_0.12_85)] transition group-hover:bg-[oklch(0.85_0.12_85/0.2)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-center text-xs leading-tight">{a.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {step.kind === "flow" && (
          <div className="pt-1">
            {step.action.key === "shift" && (
              <ShiftFlow defaultDate={defaultDate} onDone={() => onOpenChange(false)} />
            )}
            {step.action.key === "expense" && (
              <ExpenseFlow onDone={() => onOpenChange(false)} />
            )}
            {step.action.key === "reminder" && (
              <ReminderFlow defaultDate={defaultDate} onDone={() => onOpenChange(false)} />
            )}
            {(["vacation","sick","vab","leave"] as const).includes(step.action.key as any) && (
              <AbsenceFlow
                defaultKind={step.action.key as any}
                defaultDate={defaultDate}
                onDone={() => onOpenChange(false)}
              />
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

/** Global "+"-knapp som öppnar ActionSheet. */
export function ActionFab() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Vad vill du göra?"
        className="fixed bottom-6 right-6 z-40 grid h-14 w-14 place-items-center rounded-full bg-gradient-to-b from-[oklch(0.88_0.1_85)] to-[oklch(0.7_0.12_75)] text-background shadow-[0_12px_32px_-8px_oklch(0.78_0.105_85/0.55)] transition hover:scale-105 active:scale-95 lg:bottom-8 lg:right-8"
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </button>
      <ActionSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
