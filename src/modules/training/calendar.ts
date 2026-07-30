// =====================================================================
// src/modules/training/calendar.ts
// Träningsmodulens kalenderleverantör. Modulen äger sin data och
// bestämmer själv vad kalendern får se. Kalendern rör aldrig
// training_*-tabellerna.
// =====================================================================

import type {
  CalendarContribution,
  CalendarProvider,
  CalendarRange,
} from "@/platform/calendar-provider";
import { TRAINING_MODULE_ID } from "./module";
import { listSessions } from "./service";
import type { SessionStatus, TrainingSession } from "./types";

const TONE: Record<SessionStatus, CalendarContribution["tone"]> = {
  planned: "planned",
  completed: "done",
  cancelled: "cancelled",
};

const STATUS_TEXT: Record<SessionStatus, string> = {
  planned: "Planerat pass",
  completed: "Genomfört pass",
  cancelled: "Avbokat pass",
};

function hhmm(time: string | null): string | undefined {
  if (!time) return undefined;
  const [h, m] = time.split(":");
  if (!h || !m) return undefined;
  return `${h.padStart(2, "0")}:${m.slice(0, 2)}`;
}

/** Ren, testbar projektion: pass -> kalenderbidrag inom intervallet. */
export function sessionsToCalendarContributions(
  sessions: readonly TrainingSession[],
  range: CalendarRange,
): CalendarContribution[] {
  return sessions
    .filter((s) => s.scheduledOn >= range.startDate && s.scheduledOn <= range.endDate)
    .map((s) => ({
      id: s.id,
      date: s.scheduledOn,
      title: s.title,
      subtitle: STATUS_TEXT[s.status],
      time: hhmm(s.scheduledTime),
      tone: TONE[s.status],
      deepLink: s.status === "completed" ? "/traning/historik" : "/traning/pass",
      sourceTable: "training_sessions",
      sourceId: s.id,
    }));
}

export const trainingCalendarProvider: CalendarProvider = {
  id: "training.sessions",
  moduleId: TRAINING_MODULE_ID,
  label: "Träning",
  load: async (range) => {
    const result = await listSessions();
    if (!result.ok) throw new Error(result.message);
    return sessionsToCalendarContributions(result.value, range);
  },
};
