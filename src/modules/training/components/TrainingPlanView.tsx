// =====================================================================
// src/modules/training/components/TrainingPlanView.tsx
// Mallar och planerade pass. Route: /traning/pass
// =====================================================================

import { useState } from "react";
import { CalendarPlus, Dumbbell, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  addTemplateExercise,
  cancelSession,
  createTemplate,
  deleteTemplate,
  deleteTemplateExercise,
} from "../service";
import { useTrainingMutation, useTrainingSessions, useTrainingTemplates } from "../hooks";
import { isoDate, plannedFromDate } from "../summary";
import {
  EXERCISE_TYPES,
  EXERCISE_TYPE_LABEL,
  type ExerciseType,
  type SessionDetail,
  type WorkoutTemplate,
} from "../types";
import { ConfirmDelete } from "./ConfirmDelete";
import { LogSessionDialog } from "./LogSessionDialog";
import { ScheduleSessionDialog } from "./ScheduleSessionDialog";


function num(value: string): number | null {
  const t = value.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function AddExerciseForm({ template }: { template: WorkoutTemplate }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<ExerciseType>("strength");
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");

  const add = useTrainingMutation(
    async () =>
      addTemplateExercise(template.id, {
        name,
        exerciseType: type,
        plannedSets: num(sets),
        plannedReps: num(reps),
        plannedWeightKg: num(weight),
      }),
    "Övningen är tillagd.",
  );

  return (
    <div className="mt-3 flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-border p-3">
      <div className="min-w-[9rem] flex-1">
        <Label className="text-xs" htmlFor={`add-name-${template.id}`}>
          Ny övning
        </Label>
        <Input
          id={`add-name-${template.id}`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="t.ex. Bänkpress"
        />
      </div>
      <div className="w-36">
        <Label className="text-xs" htmlFor={`add-type-${template.id}`}>
          Typ
        </Label>
        <Select value={type} onValueChange={(v) => setType(v as ExerciseType)}>
          <SelectTrigger id={`add-type-${template.id}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EXERCISE_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {EXERCISE_TYPE_LABEL[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="w-16">
        <Label className="text-xs">Set</Label>
        <Input inputMode="numeric" value={sets} onChange={(e) => setSets(e.target.value)} />
      </div>
      <div className="w-16">
        <Label className="text-xs">Reps</Label>
        <Input inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} />
      </div>
      <div className="w-20">
        <Label className="text-xs">Kg</Label>
        <Input inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
      </div>
      <Button
        onClick={() =>
          add.mutate(undefined, {
            onSuccess: () => {
              setName("");
              setSets("");
              setReps("");
              setWeight("");
            },
          })
        }
        disabled={add.isPending || !name.trim()}
      >
        {add.isPending ? "Sparar…" : "Lägg till"}
      </Button>
    </div>
  );
}

function NewTemplateForm() {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const create = useTrainingMutation(
    async () => createTemplate({ name, notes }),
    "Mallen är skapad.",
  );

  return (
    <section className="rounded-2xl border border-border p-4">
      <h2 className="display text-base">Ny mall</h2>
      <div className="mt-3 space-y-3">
        <div>
          <Label htmlFor="tpl-name">Namn</Label>
          <Input
            id="tpl-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="t.ex. Överkropp A"
          />
        </div>
        <div>
          <Label htmlFor="tpl-notes">Anteckning (valfritt)</Label>
          <Textarea id="tpl-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <Button
          onClick={() =>
            create.mutate(undefined, {
              onSuccess: () => {
                setName("");
                setNotes("");
              },
            })
          }
          disabled={create.isPending || !name.trim()}
        >
          {create.isPending ? "Sparar…" : "Skapa mall"}
        </Button>
      </div>
    </section>
  );
}

export function TrainingPlanView() {
  const templates = useTrainingTemplates();
  const sessions = useTrainingSessions();
  const [scheduleFor, setScheduleFor] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [logTarget, setLogTarget] = useState<SessionDetail | null>(null);

  const removeTemplate = useTrainingMutation(
    async (id: string) => deleteTemplate(id),
    "Mallen är borttagen.",
  );
  const removeExercise = useTrainingMutation(
    async (id: string) => deleteTemplateExercise(id),
    "Övningen är borttagen.",
  );
  const cancel = useTrainingMutation(async (id: string) => cancelSession(id), "Passet är avbokat.");

  if (templates.isLoading || sessions.isLoading)
    return (
      <div className="space-y-3" aria-busy="true">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-white/[0.05]" />
        <div className="h-32 animate-pulse rounded-2xl bg-white/[0.04]" />
      </div>
    );

  if (templates.isError || sessions.isError)
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-5">
        <h1 className="display text-lg">Kunde inte laddas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {((templates.error ?? sessions.error) as Error).message}
        </p>
        <Button
          className="mt-3"
          onClick={() => {
            void templates.refetch();
            void sessions.refetch();
          }}
        >
          Försök igen
        </Button>
      </div>
    );

  const list = templates.data ?? [];
  const planned = plannedFromDate(sessions.data ?? [], isoDate(new Date()));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="display text-2xl">Mallar och planering</h1>
          <p className="text-sm text-muted-foreground">
            Bygg återanvändbara pass och planera in dem.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setScheduleFor(null);
            setScheduleOpen(true);
          }}
        >
          <CalendarPlus className="mr-1 h-4 w-4" /> Planera pass
        </Button>
      </header>

      <NewTemplateForm />

      <section className="space-y-3">
        <h2 className="display text-base">Dina mallar</h2>
        {list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center">
            <Dumbbell className="mx-auto h-7 w-7 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              Du har inga mallar än. Skapa din första ovanför.
            </p>
          </div>
        ) : (
          list.map((t) => (
            <div key={t.id} className="rounded-2xl border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-medium">{t.name}</h3>
                  {t.notes && <p className="text-xs text-muted-foreground">{t.notes}</p>}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setScheduleFor(t.id);
                      setScheduleOpen(true);
                    }}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> Planera
                  </Button>
                  <ConfirmDelete
                    title="Ta bort mallen?"
                    description={`"${t.name}" och mallens övningar tas bort. Redan loggade pass påverkas inte.`}
                    pending={removeTemplate.isPending}
                    onConfirm={() => removeTemplate.mutate(t.id)}
                    trigger={
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Ta bort mallen ${t.name}`}
                        disabled={removeTemplate.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    }
                  />

                </div>
              </div>

              {t.exercises.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">Inga övningar i mallen än.</p>
              ) : (
                <ul className="mt-2 divide-y divide-border">
                  {t.exercises
                    .slice()
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((ex) => (
                      <li key={ex.id} className="flex items-center justify-between gap-2 py-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm">{ex.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {EXERCISE_TYPE_LABEL[ex.exerciseType]}
                            {ex.plannedSets ? ` · ${ex.plannedSets} set` : ""}
                            {ex.plannedReps ? ` × ${ex.plannedReps} reps` : ""}
                            {ex.plannedWeightKg ? ` · ${ex.plannedWeightKg} kg` : ""}
                          </div>
                        </div>
                        <ConfirmDelete
                          title="Ta bort övningen?"
                          description={`"${ex.name}" tas bort från mallen.`}
                          pending={removeExercise.isPending}
                          onConfirm={() => removeExercise.mutate(ex.id)}
                          trigger={
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label={`Ta bort övningen ${ex.name}`}
                              disabled={removeExercise.isPending}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          }
                        />

                      </li>
                    ))}
                </ul>
              )}

              <AddExerciseForm template={t} />
            </div>
          ))
        )}
      </section>

      <section className="rounded-2xl border border-border p-4">
        <h2 className="display text-base">Planerade pass</h2>
        {planned.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Inga planerade pass framåt.</p>
        ) : (
          <ul className="mt-2 divide-y divide-border">
            {planned.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div>
                  <div className="text-sm">{s.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.scheduledOn}
                    {s.scheduledTime ? ` kl ${s.scheduledTime}` : ""}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setLogTarget(s)}>
                    Logga
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={cancel.isPending}
                    onClick={() => cancel.mutate(s.id)}
                  >
                    Avboka
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ScheduleSessionDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        defaultTemplateId={scheduleFor}
      />
      <LogSessionDialog
        open={logTarget !== null}
        onOpenChange={(open) => {
          if (!open) setLogTarget(null);
        }}
        session={logTarget}
      />
    </div>
  );
}
