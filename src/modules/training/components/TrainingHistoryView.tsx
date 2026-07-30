// =====================================================================
// src/modules/training/components/TrainingHistoryView.tsx
// Historik över genomförda och avbokade pass, med rättning och
// borttagning. Route: /traning/historik
// =====================================================================

import { useMemo, useState } from "react";
import { History, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { correctSession, deleteSession } from "../service";
import { useTrainingMutation, useTrainingSessions } from "../hooks";
import { sessionDistanceKm, sessionSetCount, sessionVolumeKg } from "../summary";
import { SESSION_STATUS_LABEL, type SessionDetail } from "../types";
import { ConfirmDelete } from "./ConfirmDelete";
import {
  ExerciseLogEditor,
  draftFromSession,
  toLoggedExercises,
  type DraftExercise,
} from "./ExerciseLogEditor";

function CorrectDialog({
  session,
  onClose,
}: {
  session: SessionDetail | null;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(session?.title ?? "");
  const [duration, setDuration] = useState(session?.durationMin ? String(session.durationMin) : "");
  const [effort, setEffort] = useState(
    session?.perceivedEffort ? String(session.perceivedEffort) : "",
  );
  const [notes, setNotes] = useState(session?.notes ?? "");
  const [draft, setDraft] = useState<DraftExercise[]>(
    session ? draftFromSession(session.exercises) : [],
  );

  const save = useTrainingMutation(async () => {
    if (!session) throw new Error("Inget pass valt.");
    return correctSession(session.id, {
      title,
      durationMin: duration.trim() ? Number(duration.replace(",", ".")) : null,
      perceivedEffort: effort.trim() ? Number(effort) : null,
      notes,
      exercises: toLoggedExercises(draft),
    });
  }, "Passet är rättat.");

  return (
    <Dialog open={session !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Rätta pass</DialogTitle>
          <DialogDescription>
            Ändra det som blev fel. Ändringen sparas först när databasen bekräftat.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="corr-title">Titel</Label>
            <Input id="corr-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <ExerciseLogEditor value={draft} onChange={setDraft} disabled={save.isPending} />

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="corr-duration">Total tid (min)</Label>
              <Input
                id="corr-duration"
                inputMode="decimal"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="corr-effort">Upplevd ansträngning (1–10)</Label>
              <Input
                id="corr-effort"
                inputMode="numeric"
                value={effort}
                onChange={(e) => setEffort(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="corr-notes">Anteckning</Label>
            <Textarea id="corr-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={save.isPending}>
            Avbryt
          </Button>
          <Button
            onClick={() => save.mutate(undefined, { onSuccess: onClose })}
            disabled={save.isPending}
          >
            {save.isPending ? "Sparar…" : "Spara ändring"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TrainingHistoryView() {
  const sessions = useTrainingSessions();
  const [correcting, setCorrecting] = useState<SessionDetail | null>(null);

  const remove = useTrainingMutation(
    async (id: string) => deleteSession(id),
    "Passet är borttaget.",
  );

  const history = useMemo(
    () =>
      (sessions.data ?? [])
        .filter((s) => s.status !== "planned")
        .sort((a, b) => b.scheduledOn.localeCompare(a.scheduledOn)),
    [sessions.data],
  );

  if (sessions.isLoading)
    return (
      <div className="space-y-3" aria-busy="true">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-white/[0.05]" />
        <div className="h-24 animate-pulse rounded-2xl bg-white/[0.04]" />
      </div>
    );

  if (sessions.isError)
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-5">
        <h1 className="display text-lg">Historiken kunde inte laddas</h1>
        <p className="mt-1 text-sm text-muted-foreground">{(sessions.error as Error).message}</p>
        <Button className="mt-3" onClick={() => void sessions.refetch()}>
          Försök igen
        </Button>
      </div>
    );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="display text-2xl">Träningshistorik</h1>
        <p className="text-sm text-muted-foreground">Allt du har gjort, med möjlighet att rätta.</p>
      </header>

      {history.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <History className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            Ingen historik än. Så snart du loggar ett pass hamnar det här.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {history.map((s) => (
            <li key={s.id} className="rounded-2xl border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-medium">{s.title}</h2>
                  <p className="text-xs text-muted-foreground">
                    {s.scheduledOn} · {SESSION_STATUS_LABEL[s.status]}
                    {s.durationMin ? ` · ${s.durationMin} min` : ""}
                    {s.perceivedEffort ? ` · ansträngning ${s.perceivedEffort}/10` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setCorrecting(s)}>
                    Rätta
                  </Button>
                  <ConfirmDelete
                    title="Ta bort passet?"
                    description={`"${s.title}" den ${s.scheduledOn} tas bort med alla loggade övningar och set. Det går inte att ångra.`}
                    pending={remove.isPending}
                    onConfirm={() => remove.mutate(s.id)}
                    trigger={
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Ta bort passet ${s.title}`}
                        disabled={remove.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    }
                  />
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>{s.exercises.length} övningar</span>
                <span>{sessionSetCount(s.exercises)} set</span>
                <span>{sessionVolumeKg(s.exercises)} kg volym</span>
                {sessionDistanceKm(s.exercises) > 0 && (
                  <span>{sessionDistanceKm(s.exercises)} km</span>
                )}
              </div>

              {s.exercises.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {s.exercises
                    .slice()
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((ex) => (
                      <li key={ex.id} className="text-xs">
                        <span className="text-foreground">{ex.name}</span>
                        <span className="text-muted-foreground">
                          {" — "}
                          {ex.sets
                            .slice()
                            .sort((a, b) => a.setIndex - b.setIndex)
                            .map((set) =>
                              [
                                set.reps ? `${set.reps} reps` : null,
                                set.weightKg ? `${set.weightKg} kg` : null,
                                set.durationMin ? `${set.durationMin} min` : null,
                                set.distanceKm ? `${set.distanceKm} km` : null,
                              ]
                                .filter(Boolean)
                                .join(" × "),
                            )
                            .filter((text) => text.length > 0)
                            .join(" · ") || "inga värden"}
                        </span>
                      </li>
                    ))}
                </ul>
              )}

              {s.notes && <p className="mt-2 text-xs text-muted-foreground">{s.notes}</p>}
            </li>
          ))}
        </ul>
      )}

      {correcting && (
        <CorrectDialog
          key={correcting.id}
          session={correcting}
          onClose={() => setCorrecting(null)}
        />
      )}
    </div>
  );
}
