// =====================================================================
// src/modules/training/summary.ts
// Ren, testbar beräkningslogik för översikt och statistik.
// Inga Supabase- eller UI-beroenden.
// =====================================================================

import type { SessionDetail, SessionExercise, TrainingSession } from "./types";

export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Måndag som veckostart (svensk vecka). */
export function startOfWeek(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - diff);
  return copy;
}

export function endOfWeek(d: Date): Date {
  const start = startOfWeek(d);
  start.setDate(start.getDate() + 6);
  return start;
}

/** Träningsvolym = summan av repetitioner × vikt över alla styrkeset. */
export function sessionVolumeKg(exercises: SessionExercise[]): number {
  let total = 0;
  for (const ex of exercises)
    for (const s of ex.sets)
      if (s.reps != null && s.weightKg != null) total += s.reps * Number(s.weightKg);
  return Math.round(total * 10) / 10;
}

export function sessionDistanceKm(exercises: SessionExercise[]): number {
  let total = 0;
  for (const ex of exercises)
    for (const s of ex.sets) if (s.distanceKm != null) total += Number(s.distanceKm);
  return Math.round(total * 100) / 100;
}

export function sessionSetCount(exercises: SessionExercise[]): number {
  return exercises.reduce((n, ex) => n + ex.sets.length, 0);
}

export interface TrainingSummary {
  totalSessions: number;
  totalMinutes: number;
  totalVolumeKg: number;
  totalDistanceKm: number;
  weekSessions: number;
  weekMinutes: number;
  weekVolumeKg: number;
}

export function summarize(sessions: SessionDetail[], today = new Date()): TrainingSummary {
  const from = isoDate(startOfWeek(today));
  const to = isoDate(endOfWeek(today));

  const completed = sessions.filter((s) => s.status === "completed");
  const week = completed.filter((s) => s.scheduledOn >= from && s.scheduledOn <= to);

  const minutes = (list: SessionDetail[]) =>
    Math.round(list.reduce((n, s) => n + Number(s.durationMin ?? 0), 0));
  const volume = (list: SessionDetail[]) =>
    Math.round(list.reduce((n, s) => n + sessionVolumeKg(s.exercises), 0) * 10) / 10;

  return {
    totalSessions: completed.length,
    totalMinutes: minutes(completed),
    totalVolumeKg: volume(completed),
    totalDistanceKm:
      Math.round(completed.reduce((n, s) => n + sessionDistanceKm(s.exercises), 0) * 100) / 100,
    weekSessions: week.length,
    weekMinutes: minutes(week),
    weekVolumeKg: volume(week),
  };
}

export function plannedForDate<T extends TrainingSession>(sessions: T[], date: string): T[] {
  return sessions
    .filter((s) => s.status === "planned" && s.scheduledOn === date)
    .sort((a, b) => (a.scheduledTime ?? "99").localeCompare(b.scheduledTime ?? "99"));
}

export function upcomingPlanned<T extends TrainingSession>(sessions: T[], fromDate: string): T[] {
  return sessions
    .filter((s) => s.status === "planned" && s.scheduledOn > fromDate)
    .sort((a, b) => a.scheduledOn.localeCompare(b.scheduledOn));
}

export function recentCompleted<T extends TrainingSession>(sessions: T[], limit = 5): T[] {
  return sessions
    .filter((s) => s.status === "completed")
    .sort((a, b) => b.scheduledOn.localeCompare(a.scheduledOn))
    .slice(0, limit);
}
