import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Plus, Briefcase, Wallet, TrendingUp, Phone, Plane, Bell, Map, FileText, StickyNote,
} from "lucide-react";

type Action = {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  to: string;
  search?: Record<string, string>;
};

const ACTIONS: Action[] = [
  { key: "shift",      label: "Pass",       icon: Briefcase,  to: "/planering", search: { add: "shift" } },
  { key: "expense",    label: "Utgift",     icon: Wallet,     to: "/pengar",    search: { add: "expense" } },
  { key: "income",     label: "Inkomst",    icon: TrendingUp, to: "/pengar",    search: { add: "income" } },
  { key: "oncall",     label: "Jour",       icon: Phone,      to: "/planering", search: { add: "oncall" } },
  { key: "vacation",   label: "Semester",   icon: Plane,      to: "/planering", search: { add: "vacation" } },
  { key: "reminder",   label: "Påminnelse", icon: Bell,       to: "/kalender",  search: { add: "reminder" } },
  { key: "trip",       label: "Resa",       icon: Map,        to: "/kalender",  search: { add: "trip" } },
  { key: "document",   label: "Dokument",   icon: FileText,   to: "/kalender",  search: { add: "document" } },
  { key: "note",       label: "Anteckning", icon: StickyNote, to: "/kalender",  search: { add: "note" } },
];

export function QuickAddFab() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  function handle(action: Action) {
    setOpen(false);
    navigate({ to: action.to, search: action.search as any });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Lägg till"
        className="fixed bottom-6 right-6 z-40 grid h-14 w-14 place-items-center rounded-full bg-gradient-to-b from-[oklch(0.88_0.1_85)] to-[oklch(0.7_0.12_75)] text-background shadow-[0_12px_32px_-8px_oklch(0.78_0.105_85/0.55)] transition hover:scale-105 active:scale-95 lg:bottom-8 lg:right-8"
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl border-border bg-surface/95 backdrop-blur-xl"
        >
          <SheetHeader className="mb-4">
            <SheetTitle className="display text-xl">Vad vill du lägga till?</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-3 pb-4 sm:grid-cols-4 md:grid-cols-5">
            {ACTIONS.map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.key}
                  onClick={() => handle(a)}
                  className="group flex flex-col items-center gap-2 rounded-2xl border border-border bg-white/[0.02] p-4 transition hover:border-[oklch(0.78_0.105_85/0.5)] hover:bg-[oklch(0.78_0.105_85/0.08)]"
                >
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-[oklch(0.85_0.12_85/0.12)] text-[oklch(0.85_0.12_85)] transition group-hover:bg-[oklch(0.85_0.12_85/0.2)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs">{a.label}</span>
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
