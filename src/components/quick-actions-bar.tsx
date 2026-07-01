import { useState } from "react";
import { Briefcase, Plane, Wallet, Bell, Plus, type LucideIcon } from "lucide-react";
import { ActionSheet } from "@/components/action-sheet/ActionSheet";
import { cn } from "@/lib/utils";

type QA = { key: string; label: string; icon: LucideIcon };

const DEFAULT_ACTIONS: QA[] = [
  { key: "shift",    label: "Pass",       icon: Briefcase },
  { key: "vacation", label: "Semester",   icon: Plane },
  { key: "expense",  label: "Utgift",     icon: Wallet },
  { key: "reminder", label: "Påminnelse", icon: Bell },
];

/**
 * Horisontell chip-rad högst upp på en sida.
 * Ett tryck → ActionSheet öppnas direkt på rätt flow.
 */
export function QuickActionsBar({
  actions = DEFAULT_ACTIONS,
  className,
  defaultDate,
}: {
  actions?: QA[];
  className?: string;
  defaultDate?: string;
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  return (
    <>
      <div
        className={cn(
          "-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          className,
        )}
      >
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.key}
              type="button"
              onClick={() => setOpenKey(a.key)}
              className="group inline-flex shrink-0 snap-start items-center gap-2 rounded-full border border-border bg-white/[0.02] px-4 py-2 text-sm transition hover:border-[oklch(0.78_0.105_85/0.5)] hover:bg-[oklch(0.78_0.105_85/0.08)]"
            >
              <span className="grid h-6 w-6 place-items-center rounded-full bg-[oklch(0.85_0.12_85/0.15)] text-[oklch(0.85_0.12_85)]">
                <Plus className="h-3 w-3" strokeWidth={2.5} />
              </span>
              <Icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
              <span>{a.label}</span>
            </button>
          );
        })}
      </div>
      <ActionSheet
        open={openKey !== null}
        onOpenChange={(o) => { if (!o) setOpenKey(null); }}
        defaultDate={defaultDate}
        initialActionKey={openKey ?? undefined}
      />
    </>
  );
}
