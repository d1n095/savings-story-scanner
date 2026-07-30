// =====================================================================
// src/modules/training/types.ts
// Träningsmodulens domäntyper. Ren data — inga I/O-beroenden.
// =====================================================================

export type ExerciseType = "strength" | "cardio" | "mobility" | "other";
export type SessionStatus = "planned" | "completed" | "cancelled";

export const EXERCISE_TYPES: readonly ExerciseType[] = [
  "strength",
  "cardio",
  "mobility",
  "other",
] as const;

export const EXERCISE_TYPE_LABEL: Record<ExerciseType, string> = {
  strength: "Styrka",
  cardio: "Kondition",
  mobility: "Rörlighet",
  other: "Annat",
};

export const SESSION_STATUS_LABEL: Record<SessionStatus, string> = {
  planned: "Planerat",
  completed: "Genomfört",
  cancelled: "Avbokat",
};

export interface TemplateExercise {
  id: string;
  templateId: string;
  name: string;
  exerciseType: ExerciseType;
  sortOrder: number;
  plannedSets: number | null;
  plannedReps: number | null;
  plannedWeightKg: number | null;
  plannedDurationMin: number | null;
  plannedDistanceKm: number | null;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  notes: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  exercises: TemplateExercise[];
}

export interface LoggedSet {
  id: string;
  sessionExerciseId: string;
  setIndex: number;
  reps: number | null;
  weightKg: number | null;
  durationMin: number | null;
  distanceKm: number | null;
}

export interface SessionExercise {
  id: string;
  sessionId: string;
  name: string;
  exerciseType: ExerciseType;
  sortOrder: number;
  sets: LoggedSet[];
}

export interface TrainingSession {
  id: string;
  templateId: string | null;
  title: string;
  scheduledOn: string;
  scheduledTime: string | null;
  status: SessionStatus;
  completedAt: string | null;
  durationMin: number | null;
  perceivedEffort: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SessionDetail extends TrainingSession {
  exercises: SessionExercise[];
}

// ---------- Indata ----------

export interface TemplateInput {
  name: string;
  notes?: string | null;
}

export interface TemplateExerciseInput {
  name: string;
  exerciseType: ExerciseType;
  plannedSets?: number | null;
  plannedReps?: number | null;
  plannedWeightKg?: number | null;
  plannedDurationMin?: number | null;
  plannedDistanceKm?: number | null;
}

export interface ScheduleInput {
  templateId: string | null;
  title: string;
  scheduledOn: string;
  scheduledTime?: string | null;
}

export interface SetInput {
  reps?: number | null;
  weightKg?: number | null;
  durationMin?: number | null;
  distanceKm?: number | null;
}

export interface LoggedExerciseInput {
  name: string;
  exerciseType: ExerciseType;
  sets: SetInput[];
}

export interface CompleteSessionInput {
  durationMin?: number | null;
  perceivedEffort?: number | null;
  notes?: string | null;
  exercises: LoggedExerciseInput[];
}

export interface AdHocSessionInput extends CompleteSessionInput {
  title: string;
  scheduledOn: string;
  templateId?: string | null;
}

export interface SessionCorrectionInput {
  title?: string;
  durationMin?: number | null;
  perceivedEffort?: number | null;
  notes?: string | null;
  exercises?: LoggedExerciseInput[];
}

// ---------- Fel ----------

export type TrainingErrorCode =
  | "unauthorized"
  | "forbidden"
  | "validation"
  | "not_found"
  | "persistence_failed";

export interface TrainingError {
  code: TrainingErrorCode;
  message: string;
}

export type TrainingResult<T> = { ok: true; value: T } | ({ ok: false } & TrainingError);
