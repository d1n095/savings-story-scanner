// =====================================================================
// src/modules/training/components/TrainingOverview.tsx
// Träningsöversikt: dagens planerade pass, senaste genomförda,
// veckosammanfattning och totaler. Route: /traning
// =====================================================================

import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Activity, CalendarPlus, Dumbbell, History, ListChecks, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTrainingSessions } from "../hooks";
import {
  isoDate,
  plannedForDate,
  recentCompleted,
  sessionVolumeKg,
  summarize,
  upcomingPlanned,
} from "../summary";
import type { SessionDetail } from "../types";
import { LogSessionDialog } from "./LogSessionDialog";
import { ScheduleSessionDialog } from "./ScheduleSessionDialog";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/50 p-4">
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="display mt-1 text-xl">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function TrainingOverview() {
  const sessions = useTrainingSessions();
  const [logOpen, setLogOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [logTarget, setLogTarget] = useState<SessionDetail | null>(null);

  const today = isoDate(new Date());
  const data = sessions.data ?? [];
  const summary = useMemo(() => summarize(data), [data]);
  const todayPlanned = plannedForDate(data, today);
  const upcoming = upcomingPlanned(data, today).slice(0, 3);
  const recent = recentCompleted(data, 5);

  if (sessions.isLoading)
    return (
      <div className="space-y-3" aria-busy="true">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-white/[0.05]" />
        <div className="h-24 animate-pulse rounded-2xl bg-white/[0.04]" />
        <div className="h-24 animate-pulse rounded-2xl bg-white/[0.04]" />
      </div>
    );

  if (sessions.isError)
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-5">
        <h1 className="display text-lg">Träning kunde inte laddas</h1>
        <p className="mt-1 text-sm text-muted-foreground">{(sessions.error as Error).message}</p>
        <Button className="mt-3" onClick={() => void sessions.refetch()}>
          Försök igen
        </Button>
      </div>
    );

  const empty = data.length === 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="display text-2xl">Träning</h1>
          <p className="text-sm text-muted-foreground">
            Planera, logga och följ din träning över tid.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              setLogTarget(null);
              setLogOpen(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" /> Logga pass
          </Button>
          <Button variant="outline" onClick={() => setScheduleOpen(true)}>
            <CalendarPlus className="mr-1 h-4 w-4" /> Planera pass
          </Button>
        </div>
      </header>

      <nav className="flex flex-wrap gap-2" aria-label="Träningssektioner">
        <Button asChild variant="secondary" size="sm">
          <Link to="/traning/pass">
            <ListChecks className="mr-1 h-4 w-4" /> Mallar och planering
          </Link>
        </Button>
        <Button asChild variant="secondary" size="sm">
          <Link to="/traning/historik">
            <History className="mr-1 h-4 w-4" /> Historik
          </Link>
        </Button>
      </nav>

      {empty ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <Dumbbell className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="display mt-3 text-lg">Inga träningspass än</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Börja med att skapa en träningsmall, planera ett pass i kalendern för veckan eller logga
            ett pass du redan har gjort.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button asChild variant="outline">
              <Link to="/traning/pass">Skapa mall</Link>
            </Button>
            <Button
              onClick={() => {
                setLogTarget(null);
                setLogOpen(true);
              }}
            >
              Logga pass
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Denna vecka"
              value={`${summary.weekSessions} pass`}
              hint={`${summary.weekMinutes} min`}
            />
            <Stat label="Volym i veckan" value={`${summary.weekVolumeKg} kg`} />
            <Stat label="Totalt" value={`${summary.totalSessions} pass`} />
            <Stat
              label="Total tid"
              value={`${summary.totalMinutes} min`}
              hint={
                summary.totalDistanceKm > 0 ? `${summary.totalDistanceKm} km kondition` : undefined
              }
            />
          </div>

          <section className="rounded-2xl border border-border p-4">
            <h2 className="display text-base">Idag</h2>
            {todayPlanned.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Inget pass planerat idag.
                {upcoming.length > 0 &&
                  ` Nästa: ${upcoming[0].title} den ${upcoming[0].scheduledOn}.`}
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {todayPlanned.map((s) => (
                  <li
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2"
                  >
                    <div>
                      <div className="text-sm">{s.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {s.scheduledTime ? `kl ${s.scheduledTime}` : "ingen tid satt"}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setLogTarget(s);
                        setLogOpen(true);
                      }}
                    >
                      Logga
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-border p-4">
            <div className="flex items-center justify-between">
              <h2 className="display text-base">Senaste genomförda</h2>
              <Link to="/traning/historik" className="text-xs text-muted-foreground underline">
                Se all historik
              </Link>
            </div>
            {recent.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Inga genomförda pass ännu. Logga ditt första pass.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-border">
                {recent.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm">{s.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {s.scheduledOn} · {s.exercises.length} övningar
                        {s.durationMin ? ` · ${s.durationMin} min` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Activity className="h-3.5 w-3.5" />
                      {sessionVolumeKg(s.exercises)} kg
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <LogSessionDialog open={logOpen} onOpenChange={setLogOpen} session={logTarget} />
      <ScheduleSessionDialog open={scheduleOpen} onOpenChange={setScheduleOpen} />
    </div>
  );
}
