// =====================================================================
// src/modules/training/service.ts
// Träningsmodulens ENDA dataåtkomstlager. UI-komponenter gör aldrig egna
// Supabase-anrop. Auktorisation upprätthålls av RLS i databasen; det här
// lagret lägger till ägarfilter och typade fel ovanpå.
// =====================================================================

import { supabase } from "@/integrations/supabase/client";
import { publishTrainingEvent } from "./events";
import type {
  AdHocSessionInput,
  CompleteSessionInput,
  ExerciseType,
  LoggedExerciseInput,
  ScheduleInput,
  SessionCorrectionInput,
  SessionDetail,
  SessionExercise,
  TemplateExercise,
  TemplateExerciseInput,
  TemplateInput,
  TrainingErrorCode,
  TrainingResult,
  TrainingSession,
  WorkoutTemplate,
} from "./types";

const fail = <T>(code: TrainingErrorCode, message: string): TrainingResult<T> => ({
  ok: false,
  code,
  message,
});
const done = <T>(value: T): TrainingResult<T> => ({ ok: true, value });

const NO_AUTH = "Du måste vara inloggad för att använda Träning.";

async function requireUser(): Promise<TrainingResult<string>> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return fail("unauthorized", NO_AUTH);
  return done(data.user.id);
}

function dbFail<T>(message: string, detail?: string): TrainingResult<T> {
  const text = detail ? `${message} (${detail})` : message;
  if (detail && /row-level security|permission denied/i.test(detail))
    return fail("forbidden", "Du saknar behörighet till den här träningsposten.");
  return fail("persistence_failed", text);
}

function num(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return Number.isFinite(value) ? Number(value) : null;
}

// ---------------------------------------------------------------- mallar

type TemplateRow = {
  id: string;
  name: string;
  notes: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
};

type TemplateExerciseRow = {
  id: string;
  template_id: string;
  name: string;
  exercise_type: ExerciseType;
  sort_order: number;
  planned_sets: number | null;
  planned_reps: number | null;
  planned_weight_kg: number | null;
  planned_duration_min: number | null;
  planned_distance_km: number | null;
};

const TEMPLATE_COLS = "id, name, notes, archived, created_at, updated_at";
const TEMPLATE_EX_COLS =
  "id, template_id, name, exercise_type, sort_order, planned_sets, planned_reps, planned_weight_kg, planned_duration_min, planned_distance_km";

function toTemplateExercise(r: TemplateExerciseRow): TemplateExercise {
  return {
    id: r.id,
    templateId: r.template_id,
    name: r.name,
    exerciseType: r.exercise_type,
    sortOrder: r.sort_order,
    plannedSets: r.planned_sets,
    plannedReps: r.planned_reps,
    plannedWeightKg: num(r.planned_weight_kg),
    plannedDurationMin: num(r.planned_duration_min),
    plannedDistanceKm: num(r.planned_distance_km),
  };
}

export async function listTemplates(): Promise<TrainingResult<WorkoutTemplate[]>> {
  const user = await requireUser();
  if (!user.ok) return user;

  const templates = await supabase
    .from("training_templates")
    .select(TEMPLATE_COLS)
    .eq("user_id", user.value)
    .order("name", { ascending: true });
  if (templates.error)
    return dbFail("Kunde inte läsa dina träningsmallar.", templates.error.message);

  const exercises = await supabase
    .from("training_template_exercises")
    .select(TEMPLATE_EX_COLS)
    .eq("user_id", user.value)
    .order("sort_order", { ascending: true });
  if (exercises.error) return dbFail("Kunde inte läsa mallens övningar.", exercises.error.message);

  const byTemplate = new Map<string, TemplateExercise[]>();
  for (const row of (exercises.data ?? []) as TemplateExerciseRow[]) {
    const list = byTemplate.get(row.template_id) ?? [];
    list.push(toTemplateExercise(row));
    byTemplate.set(row.template_id, list);
  }

  return done(
    ((templates.data ?? []) as TemplateRow[]).map((t) => ({
      id: t.id,
      name: t.name,
      notes: t.notes,
      archived: t.archived,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
      exercises: byTemplate.get(t.id) ?? [],
    })),
  );
}

export async function createTemplate(input: TemplateInput): Promise<TrainingResult<string>> {
  const user = await requireUser();
  if (!user.ok) return user;
  const name = input.name.trim();
  if (!name) return fail("validation", "Mallen behöver ett namn.");
  if (name.length > 80) return fail("validation", "Namnet får vara max 80 tecken.");

  const { data, error } = await supabase
    .from("training_templates")
    .insert({ user_id: user.value, name, notes: input.notes?.trim() || null })
    .select("id")
    .single();
  if (error || !data) return dbFail("Mallen kunde inte sparas.", error?.message);
  return done(data.id);
}

export async function updateTemplate(
  templateId: string,
  input: TemplateInput,
): Promise<TrainingResult<null>> {
  const user = await requireUser();
  if (!user.ok) return user;
  const name = input.name.trim();
  if (!name) return fail("validation", "Mallen behöver ett namn.");

  const { data, error } = await supabase
    .from("training_templates")
    .update({ name, notes: input.notes?.trim() || null })
    .eq("id", templateId)
    .eq("user_id", user.value)
    .select("id");
  if (error) return dbFail("Mallen kunde inte uppdateras.", error.message);
  if (!data || data.length === 0) return fail("not_found", "Mallen finns inte längre.");
  return done(null);
}

export async function deleteTemplate(templateId: string): Promise<TrainingResult<null>> {
  const user = await requireUser();
  if (!user.ok) return user;
  const { data, error } = await supabase
    .from("training_templates")
    .delete()
    .eq("id", templateId)
    .eq("user_id", user.value)
    .select("id");
  if (error) return dbFail("Mallen kunde inte tas bort.", error.message);
  if (!data || data.length === 0) return fail("not_found", "Mallen finns inte längre.");
  return done(null);
}

function validateExercise(input: TemplateExerciseInput): string | null {
  if (!input.name.trim()) return "Övningen behöver ett namn.";
  const numbers = [
    input.plannedSets,
    input.plannedReps,
    input.plannedWeightKg,
    input.plannedDurationMin,
    input.plannedDistanceKm,
  ];
  if (numbers.some((n) => n !== null && n !== undefined && n < 0))
    return "Planerade värden kan inte vara negativa.";
  return null;
}

export async function addTemplateExercise(
  templateId: string,
  input: TemplateExerciseInput,
): Promise<TrainingResult<string>> {
  const user = await requireUser();
  if (!user.ok) return user;
  const invalid = validateExercise(input);
  if (invalid) return fail("validation", invalid);

  const existing = await supabase
    .from("training_template_exercises")
    .select("sort_order")
    .eq("user_id", user.value)
    .eq("template_id", templateId)
    .order("sort_order", { ascending: false })
    .limit(1);
  if (existing.error) return dbFail("Kunde inte läsa mallens ordning.", existing.error.message);
  const nextOrder = (existing.data?.[0]?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("training_template_exercises")
    .insert({
      user_id: user.value,
      template_id: templateId,
      name: input.name.trim(),
      exercise_type: input.exerciseType,
      sort_order: nextOrder,
      planned_sets: input.plannedSets ?? null,
      planned_reps: input.plannedReps ?? null,
      planned_weight_kg: input.plannedWeightKg ?? null,
      planned_duration_min: input.plannedDurationMin ?? null,
      planned_distance_km: input.plannedDistanceKm ?? null,
    })
    .select("id")
    .single();
  if (error || !data) {
    if (error && /violates foreign key/i.test(error.message))
      return fail("forbidden", "Mallen tillhör inte dig.");
    return dbFail("Övningen kunde inte sparas.", error?.message);
  }
  return done(data.id);
}

export async function updateTemplateExercise(
  exerciseId: string,
  input: TemplateExerciseInput,
): Promise<TrainingResult<null>> {
  const user = await requireUser();
  if (!user.ok) return user;
  const invalid = validateExercise(input);
  if (invalid) return fail("validation", invalid);

  const { data, error } = await supabase
    .from("training_template_exercises")
    .update({
      name: input.name.trim(),
      exercise_type: input.exerciseType,
      planned_sets: input.plannedSets ?? null,
      planned_reps: input.plannedReps ?? null,
      planned_weight_kg: input.plannedWeightKg ?? null,
      planned_duration_min: input.plannedDurationMin ?? null,
      planned_distance_km: input.plannedDistanceKm ?? null,
    })
    .eq("id", exerciseId)
    .eq("user_id", user.value)
    .select("id");
  if (error) return dbFail("Övningen kunde inte uppdateras.", error.message);
  if (!data || data.length === 0) return fail("not_found", "Övningen finns inte längre.");
  return done(null);
}

export async function deleteTemplateExercise(exerciseId: string): Promise<TrainingResult<null>> {
  const user = await requireUser();
  if (!user.ok) return user;
  const { data, error } = await supabase
    .from("training_template_exercises")
    .delete()
    .eq("id", exerciseId)
    .eq("user_id", user.value)
    .select("id");
  if (error) return dbFail("Övningen kunde inte tas bort.", error.message);
  if (!data || data.length === 0) return fail("not_found", "Övningen finns inte längre.");
  return done(null);
}

/** Sätter ny ordning. Endast egna rader kan flyttas. */
export async function reorderTemplateExercises(
  templateId: string,
  orderedIds: string[],
): Promise<TrainingResult<null>> {
  const user = await requireUser();
  if (!user.ok) return user;
  for (let i = 0; i < orderedIds.length; i += 1) {
    const { error } = await supabase
      .from("training_template_exercises")
      .update({ sort_order: i })
      .eq("id", orderedIds[i])
      .eq("user_id", user.value)
      .eq("template_id", templateId);
    if (error) return dbFail("Ordningen kunde inte sparas.", error.message);
  }
  return done(null);
}

// ---------------------------------------------------------------- pass

type SessionRow = {
  id: string;
  template_id: string | null;
  title: string;
  scheduled_on: string;
  scheduled_time: string | null;
  status: "planned" | "completed" | "cancelled";
  completed_at: string | null;
  duration_min: number | null;
  perceived_effort: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const SESSION_COLS =
  "id, template_id, title, scheduled_on, scheduled_time, status, completed_at, duration_min, perceived_effort, notes, created_at, updated_at";

function toSession(r: SessionRow): TrainingSession {
  return {
    id: r.id,
    templateId: r.template_id,
    title: r.title,
    scheduledOn: r.scheduled_on,
    scheduledTime: r.scheduled_time ? r.scheduled_time.slice(0, 5) : null,
    status: r.status,
    completedAt: r.completed_at,
    durationMin: num(r.duration_min),
    perceivedEffort: r.perceived_effort,
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/** Alla pass med deras loggade övningar och set. */
export async function listSessions(): Promise<TrainingResult<SessionDetail[]>> {
  const user = await requireUser();
  if (!user.ok) return user;

  const sessions = await supabase
    .from("training_sessions")
    .select(SESSION_COLS)
    .eq("user_id", user.value)
    .order("scheduled_on", { ascending: false });
  if (sessions.error) return dbFail("Kunde inte läsa dina pass.", sessions.error.message);

  const exercises = await supabase
    .from("training_session_exercises")
    .select("id, session_id, name, exercise_type, sort_order")
    .eq("user_id", user.value)
    .order("sort_order", { ascending: true });
  if (exercises.error) return dbFail("Kunde inte läsa passets övningar.", exercises.error.message);

  const sets = await supabase
    .from("training_sets")
    .select("id, session_exercise_id, set_index, reps, weight_kg, duration_min, distance_km")
    .eq("user_id", user.value)
    .order("set_index", { ascending: true });
  if (sets.error) return dbFail("Kunde inte läsa loggade set.", sets.error.message);

  const setsByExercise = new Map<string, SessionExercise["sets"]>();
  for (const s of sets.data ?? []) {
    const list = setsByExercise.get(s.session_exercise_id) ?? [];
    list.push({
      id: s.id,
      sessionExerciseId: s.session_exercise_id,
      setIndex: s.set_index,
      reps: s.reps,
      weightKg: num(s.weight_kg),
      durationMin: num(s.duration_min),
      distanceKm: num(s.distance_km),
    });
    setsByExercise.set(s.session_exercise_id, list);
  }

  const exercisesBySession = new Map<string, SessionExercise[]>();
  for (const e of exercises.data ?? []) {
    const list = exercisesBySession.get(e.session_id) ?? [];
    list.push({
      id: e.id,
      sessionId: e.session_id,
      name: e.name,
      exerciseType: e.exercise_type as ExerciseType,
      sortOrder: e.sort_order,
      sets: setsByExercise.get(e.id) ?? [],
    });
    exercisesBySession.set(e.session_id, list);
  }

  return done(
    ((sessions.data ?? []) as SessionRow[]).map((row) => ({
      ...toSession(row),
      exercises: exercisesBySession.get(row.id) ?? [],
    })),
  );
}

export async function scheduleSession(input: ScheduleInput): Promise<TrainingResult<string>> {
  const user = await requireUser();
  if (!user.ok) return user;
  const title = input.title.trim();
  if (!title) return fail("validation", "Passet behöver en titel.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.scheduledOn))
    return fail("validation", "Välj ett giltigt datum.");

  const { data, error } = await supabase
    .from("training_sessions")
    .insert({
      user_id: user.value,
      template_id: input.templateId,
      title,
      scheduled_on: input.scheduledOn,
      scheduled_time: input.scheduledTime || null,
      status: "planned",
    })
    .select("id")
    .single();
  if (error || !data) {
    if (error && /violates foreign key/i.test(error.message))
      return fail("forbidden", "Mallen tillhör inte dig.");
    return dbFail("Passet kunde inte planeras.", error?.message);
  }
  publishTrainingEvent("training.session.scheduled", user.value, {
    sessionId: data.id,
    title,
    scheduledOn: input.scheduledOn,
    scheduledTime: input.scheduledTime ?? null,
  });
  return done(data.id);
}

export async function rescheduleSession(
  sessionId: string,
  scheduledOn: string,
  scheduledTime: string | null,
): Promise<TrainingResult<null>> {
  const user = await requireUser();
  if (!user.ok) return user;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduledOn))
    return fail("validation", "Välj ett giltigt datum.");

  const { data, error } = await supabase
    .from("training_sessions")
    .update({ scheduled_on: scheduledOn, scheduled_time: scheduledTime || null })
    .eq("id", sessionId)
    .eq("user_id", user.value)
    .select("id, title");
  if (error) return dbFail("Passet kunde inte flyttas.", error.message);
  if (!data || data.length === 0) return fail("not_found", "Passet finns inte längre.");
  publishTrainingEvent("training.session.rescheduled", user.value, {
    sessionId,
    title: data[0].title,
    scheduledOn,
    scheduledTime,
  });
  return done(null);
}

export async function cancelSession(sessionId: string): Promise<TrainingResult<null>> {
  const user = await requireUser();
  if (!user.ok) return user;
  const { data, error } = await supabase
    .from("training_sessions")
    .update({ status: "cancelled" })
    .eq("id", sessionId)
    .eq("user_id", user.value)
    .eq("status", "planned")
    .select("id, title, scheduled_on");
  if (error) return dbFail("Passet kunde inte avbokas.", error.message);
  if (!data || data.length === 0) return fail("not_found", "Det finns inget planerat pass att avboka.");
  publishTrainingEvent("training.session.cancelled", user.value, {
    sessionId,
    title: data[0].title,
    scheduledOn: data[0].scheduled_on,
  });
  return done(null);
}

function validateLoggedExercises(exercises: LoggedExerciseInput[]): string | null {
  if (exercises.length === 0) return "Lägg till minst en övning innan du sparar passet.";
  for (const ex of exercises) {
    if (!ex.name.trim()) return "Varje övning behöver ett namn.";
    for (const s of ex.sets) {
      const values = [s.reps, s.weightKg, s.durationMin, s.distanceKm];
      if (values.some((v) => v !== null && v !== undefined && v < 0))
        return "Loggade värden kan inte vara negativa.";
      if (values.every((v) => v === null || v === undefined))
        return `Fyll i minst ett värde för varje set i "${ex.name.trim()}".`;
    }
  }
  return null;
}

async function replaceSessionExercises(
  userId: string,
  sessionId: string,
  exercises: LoggedExerciseInput[],
): Promise<TrainingResult<null>> {
  const cleared = await supabase
    .from("training_session_exercises")
    .delete()
    .eq("session_id", sessionId)
    .eq("user_id", userId);
  if (cleared.error) return dbFail("Kunde inte rensa tidigare övningar.", cleared.error.message);

  for (let i = 0; i < exercises.length; i += 1) {
    const ex = exercises[i];
    const inserted = await supabase
      .from("training_session_exercises")
      .insert({
        user_id: userId,
        session_id: sessionId,
        name: ex.name.trim(),
        exercise_type: ex.exerciseType,
        sort_order: i,
      })
      .select("id")
      .single();
    if (inserted.error || !inserted.data)
      return dbFail("Övningen kunde inte sparas.", inserted.error?.message);

    if (ex.sets.length === 0) continue;
    const rows = ex.sets.map((s, index) => ({
      user_id: userId,
      session_exercise_id: inserted.data.id,
      set_index: index + 1,
      reps: s.reps ?? null,
      weight_kg: s.weightKg ?? null,
      duration_min: s.durationMin ?? null,
      distance_km: s.distanceKm ?? null,
    }));
    const setsInserted = await supabase.from("training_sets").insert(rows);
    if (setsInserted.error) return dbFail("Seten kunde inte sparas.", setsInserted.error.message);
  }
  return done(null);
}

/** Markerar ett planerat pass som genomfört och sparar loggen. */
export async function completeSession(
  sessionId: string,
  input: CompleteSessionInput,
): Promise<TrainingResult<null>> {
  const user = await requireUser();
  if (!user.ok) return user;
  const invalid = validateLoggedExercises(input.exercises);
  if (invalid) return fail("validation", invalid);
  if (input.perceivedEffort != null && (input.perceivedEffort < 1 || input.perceivedEffort > 10))
    return fail("validation", "Upplevd ansträngning anges 1–10.");

  const saved = await replaceSessionExercises(user.value, sessionId, input.exercises);
  if (!saved.ok) return saved;

  const { data, error } = await supabase
    .from("training_sessions")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      duration_min: input.durationMin ?? null,
      perceived_effort: input.perceivedEffort ?? null,
      notes: input.notes?.trim() || null,
    })
    .eq("id", sessionId)
    .eq("user_id", user.value)
    .select("id, title, scheduled_on");
  if (error) return dbFail("Passet kunde inte markeras som genomfört.", error.message);
  if (!data || data.length === 0) return fail("not_found", "Passet finns inte längre.");
  publishTrainingEvent("training.session.completed", user.value, {
    sessionId,
    title: data[0].title,
    scheduledOn: data[0].scheduled_on,
  });
  return done(null);
}

/** Loggar ett pass som inte planerats i förväg. */
export async function logAdHocSession(input: AdHocSessionInput): Promise<TrainingResult<string>> {
  const created = await scheduleSession({
    templateId: input.templateId ?? null,
    title: input.title,
    scheduledOn: input.scheduledOn,
  });
  if (!created.ok) return created;

  const completed = await completeSession(created.value, {
    durationMin: input.durationMin,
    perceivedEffort: input.perceivedEffort,
    notes: input.notes,
    exercises: input.exercises,
  });
  if (!completed.ok) return { ok: false, code: completed.code, message: completed.message };
  return done(created.value);
}

/** Rättar ett historiskt pass: anteckningar, längd, ansträngning och loggade värden. */
export async function correctSession(
  sessionId: string,
  input: SessionCorrectionInput,
): Promise<TrainingResult<null>> {
  const user = await requireUser();
  if (!user.ok) return user;
  if (input.title !== undefined && !input.title.trim())
    return fail("validation", "Passet behöver en titel.");
  if (input.perceivedEffort != null && (input.perceivedEffort < 1 || input.perceivedEffort > 10))
    return fail("validation", "Upplevd ansträngning anges 1–10.");
  if (input.exercises) {
    const invalid = validateLoggedExercises(input.exercises);
    if (invalid) return fail("validation", invalid);
  }

  const patch: {
    title?: string;
    duration_min?: number | null;
    perceived_effort?: number | null;
    notes?: string | null;
  } = {};
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.durationMin !== undefined) patch.duration_min = input.durationMin;
  if (input.perceivedEffort !== undefined) patch.perceived_effort = input.perceivedEffort;
  if (input.notes !== undefined) patch.notes = input.notes?.trim() || null;

  if (Object.keys(patch).length > 0) {
    const { data, error } = await supabase
      .from("training_sessions")
      .update(patch)
      .eq("id", sessionId)
      .eq("user_id", user.value)
      .select("id");
    if (error) return dbFail("Ändringen kunde inte sparas.", error.message);
    if (!data || data.length === 0) return fail("not_found", "Passet finns inte längre.");
  }

  if (input.exercises) {
    const saved = await replaceSessionExercises(user.value, sessionId, input.exercises);
    if (!saved.ok) return saved;
  }
  return done(null);
}

/** Tar bort exakt ett av användarens egna pass (med dess övningar och set). */
export async function deleteSession(sessionId: string): Promise<TrainingResult<null>> {
  const user = await requireUser();
  if (!user.ok) return user;
  const { data, error } = await supabase
    .from("training_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", user.value)
    .select("id, title, scheduled_on");
  if (error) return dbFail("Passet kunde inte tas bort.", error.message);
  if (!data || data.length === 0) return fail("not_found", "Passet finns inte längre.");
  publishTrainingEvent("training.session.deleted", user.value, {
    sessionId,
    title: data[0].title,
    scheduledOn: data[0].scheduled_on,
  });
  return done(null);
}

/** Övningsförslag när ett pass startas från en mall. */
export function exercisesFromTemplate(template: WorkoutTemplate): LoggedExerciseInput[] {
  return template.exercises
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((ex) => ({
      name: ex.name,
      exerciseType: ex.exerciseType,
      sets: Array.from({ length: Math.max(1, ex.plannedSets ?? 1) }, () => ({
        reps: ex.plannedReps ?? null,
        weightKg: ex.plannedWeightKg ?? null,
        durationMin: ex.plannedDurationMin ?? null,
        distanceKm: ex.plannedDistanceKm ?? null,
      })),
    }));
}
