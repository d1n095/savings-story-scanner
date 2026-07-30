// =====================================================================
// src/modules/training/events.ts
// Träningsmodulens utgående händelser. Kalenderintegration sker via
// dessa kuvert — aldrig genom att skriva i en annan moduls tabeller.
// =====================================================================

import { createEventEnvelope, type EventEnvelope } from "@/platform/events";
import { TRAINING_MODULE_ID } from "./module";

export type TrainingEventName =
  | "training.session.scheduled"
  | "training.session.rescheduled"
  | "training.session.cancelled"
  | "training.session.completed"
  | "training.session.deleted";

export interface TrainingEventPayload {
  sessionId: string;
  title: string;
  scheduledOn: string;
  scheduledTime?: string | null;
}

export type TrainingEventSink = (event: EventEnvelope<TrainingEventPayload>) => void;

let sink: TrainingEventSink | null = null;

/** Skalet/LifeOS kan koppla in en mottagare. Utan mottagare är publicering inert. */
export function setTrainingEventSink(next: TrainingEventSink | null): void {
  sink = next;
}

export function buildTrainingEvent(
  name: TrainingEventName,
  ownerUserId: string,
  payload: TrainingEventPayload,
): EventEnvelope<TrainingEventPayload> {
  return createEventEnvelope<TrainingEventPayload>({
    name,
    version: "1.0.0",
    moduleId: TRAINING_MODULE_ID,
    ownerContextId: ownerUserId,
    actorUserId: ownerUserId,
    payload,
    dedupeKey: `${name}:${payload.sessionId}`,
  });
}

export function publishTrainingEvent(
  name: TrainingEventName,
  ownerUserId: string,
  payload: TrainingEventPayload,
): void {
  if (!sink) return;
  sink(buildTrainingEvent(name, ownerUserId, payload));
}
