// =====================================================================
// src/modules/training/components/ExerciseLogEditor.tsx
// Delad redigerare för loggade övningar och set. Används både när ett
// pass loggas och när ett historiskt pass rättas.
// =====================================================================

import { Plus, Trash2 } from "lucide-react";
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
import {
  EXERCISE_TYPES,
  EXERCISE_TYPE_LABEL,
  type ExerciseType,
  type LoggedExerciseInput,
  type SessionExercise,
  type WorkoutTemplate,
} from "../types";

export interface DraftSet {
  reps: string;
  weightKg: string;
  durationMin: string;
  distanceKm: string;
}

export interface DraftExercise {
  name: string;
  exerciseType: ExerciseType;
  sets: DraftSet[];
}

export const emptySet = (): DraftSet => ({
  reps: "",
  weightKg: "",
  durationMin: "",
  distanceKm: "",
});

export const emptyExercise = (): DraftExercise => ({
  name: "",
  exerciseType: "strength",
  sets: [emptySet()],
});

const str = (value: number | null | undefined): string =>
  value === null || value === undefined ? "" : String(value);

export function draftFromTemplate(template: WorkoutTemplate): DraftExercise[] {
  return template.exercises
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((ex) => ({
      name: ex.name,
      exerciseType: ex.exerciseType,
      sets: Array.from({ length: Math.max(1, ex.plannedSets ?? 1) }, () => ({
        reps: str(ex.plannedReps),
        weightKg: str(ex.plannedWeightKg),
        durationMin: str(ex.plannedDurationMin),
        distanceKm: str(ex.plannedDistanceKm),
      })),
    }));
}

export function draftFromSession(exercises: SessionExercise[]): DraftExercise[] {
  return exercises
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((ex) => ({
      name: ex.name,
      exerciseType: ex.exerciseType,
      sets:
        ex.sets.length > 0
          ? ex.sets.map((s) => ({
              reps: str(s.reps),
              weightKg: str(s.weightKg),
              durationMin: str(s.durationMin),
              distanceKm: str(s.distanceKm),
            }))
          : [emptySet()],
    }));
}

const parse = (value: string): number | null => {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
};

export function toLoggedExercises(draft: DraftExercise[]): LoggedExerciseInput[] {
  return draft.map((ex) => ({
    name: ex.name,
    exerciseType: ex.exerciseType,
    sets: ex.sets.map((s) => ({
      reps: parse(s.reps),
      weightKg: parse(s.weightKg),
      durationMin: parse(s.durationMin),
      distanceKm: parse(s.distanceKm),
    })),
  }));
}

interface Props {
  value: DraftExercise[];
  onChange: (next: DraftExercise[]) => void;
  disabled?: boolean;
}

export function ExerciseLogEditor({ value, onChange, disabled }: Props) {
  function patchExercise(index: number, patch: Partial<DraftExercise>) {
    onChange(value.map((ex, i) => (i === index ? { ...ex, ...patch } : ex)));
  }

  function patchSet(exIndex: number, setIndex: number, patch: Partial<DraftSet>) {
    onChange(
      value.map((ex, i) =>
        i === exIndex
          ? { ...ex, sets: ex.sets.map((s, j) => (j === setIndex ? { ...s, ...patch } : s)) }
          : ex,
      ),
    );
  }

  return (
    <div className="space-y-4">
      {value.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          Inga övningar än. Lägg till din första övning nedan.
        </p>
      )}

      {value.map((ex, exIndex) => {
        const isCardio = ex.exerciseType === "cardio";
        const isStrength = ex.exerciseType === "strength";
        return (
          <div key={exIndex} className="rounded-xl border border-border p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Label htmlFor={`ex-name-${exIndex}`} className="text-xs">
                  Övning
                </Label>
                <Input
                  id={`ex-name-${exIndex}`}
                  value={ex.name}
                  disabled={disabled}
                  placeholder="t.ex. Knäböj"
                  onChange={(e) => patchExercise(exIndex, { name: e.target.value })}
                />
              </div>
              <div className="sm:w-40">
                <Label className="text-xs" htmlFor={`ex-type-${exIndex}`}>
                  Typ
                </Label>
                <Select
                  value={ex.exerciseType}
                  disabled={disabled}
                  onValueChange={(v) => patchExercise(exIndex, { exerciseType: v as ExerciseType })}
                >
                  <SelectTrigger id={`ex-type-${exIndex}`} aria-label="Övningstyp">
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
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={disabled}
                aria-label={`Ta bort övning ${ex.name || exIndex + 1}`}
                onClick={() => onChange(value.filter((_, i) => i !== exIndex))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-3 space-y-2">
              {ex.sets.map((s, setIndex) => (
                <div key={setIndex} className="flex flex-wrap items-end gap-2">
                  <span className="w-10 pb-2 text-xs text-muted-foreground">#{setIndex + 1}</span>
                  {isStrength || ex.exerciseType === "other" ? (
                    <>
                      <div className="w-20">
                        <Label className="text-[10px]">Reps</Label>
                        <Input
                          inputMode="numeric"
                          aria-label={`Repetitioner set ${setIndex + 1}`}
                          value={s.reps}
                          disabled={disabled}
                          onChange={(e) => patchSet(exIndex, setIndex, { reps: e.target.value })}
                        />
                      </div>
                      <div className="w-24">
                        <Label className="text-[10px]">Vikt (kg)</Label>
                        <Input
                          inputMode="decimal"
                          aria-label={`Vikt set ${setIndex + 1}`}
                          value={s.weightKg}
                          disabled={disabled}
                          onChange={(e) => patchSet(exIndex, setIndex, { weightKg: e.target.value })}
                        />
                      </div>
                    </>
                  ) : null}
                  <div className="w-24">
                    <Label className="text-[10px]">Tid (min)</Label>
                    <Input
                      inputMode="decimal"
                      aria-label={`Tid set ${setIndex + 1}`}
                      value={s.durationMin}
                      disabled={disabled}
                      onChange={(e) => patchSet(exIndex, setIndex, { durationMin: e.target.value })}
                    />
                  </div>
                  {isCardio && (
                    <div className="w-24">
                      <Label className="text-[10px]">Distans (km)</Label>
                      <Input
                        inputMode="decimal"
                        aria-label={`Distans set ${setIndex + 1}`}
                        value={s.distanceKm}
                        disabled={disabled}
                        onChange={(e) => patchSet(exIndex, setIndex, { distanceKm: e.target.value })}
                      />
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={disabled || ex.sets.length === 1}
                    aria-label={`Ta bort set ${setIndex + 1}`}
                    onClick={() =>
                      patchExercise(exIndex, { sets: ex.sets.filter((_, j) => j !== setIndex) })
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={() => patchExercise(exIndex, { sets: [...ex.sets, emptySet()] })}
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Set
              </Button>
            </div>
          </div>
        );
      })}

      <Button
        type="button"
        variant="secondary"
        disabled={disabled}
        onClick={() => onChange([...value, emptyExercise()])}
      >
        <Plus className="mr-1 h-4 w-4" /> Lägg till övning
      </Button>
    </div>
  );
}
