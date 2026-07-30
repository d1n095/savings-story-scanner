// =====================================================================
// src/platform/events.ts
// Utgående händelser: LifeApp -> LifeOS (audit + fan-out) -> LifeAI.
// INERT: inga nätverksanrop, ingen koppling till timeline_events ännu.
// =====================================================================

import type { ContractVersion, SemVer } from "./contracts";
import { CONTRACT_VERSION } from "./contracts";

export type EventSeverity = "info" | "notice" | "warning" | "critical";

/** Kuvert för en händelse på väg ut ur LifeApp. */
export interface EventEnvelope<TPayload = unknown> {
  contractVersion: ContractVersion;
  eventId: string;
  /** Punktnoterat namn, t.ex. "shift.created". */
  name: string;
  version: SemVer;
  /** Vilken modul som avsände händelsen. */
  moduleId: string;
  ownerContextId: string;
  /** Vem som utlöste händelsen (audit). */
  actorUserId?: string;
  occurredAt: string; // ISO 8601
  severity: EventSeverity;
  /** Idempotensnyckel — samma nyckel får bara levereras en gång. */
  dedupeKey?: string;
  payload: TPayload;
}

export interface EventEnvelopeInput<TPayload = unknown>
  extends Omit<EventEnvelope<TPayload>, "contractVersion" | "eventId" | "occurredAt" | "severity"> {
  eventId?: string;
  occurredAt?: string;
  severity?: EventSeverity;
}

/** Ren fabrik. Skriver ingenting någonstans. */
export function createEventEnvelope<TPayload>(
  input: EventEnvelopeInput<TPayload>,
  idFactory: () => string = () => globalThis.crypto.randomUUID(),
  now: () => Date = () => new Date(),
): EventEnvelope<TPayload> {
  return {
    contractVersion: CONTRACT_VERSION,
    eventId: input.eventId ?? idFactory(),
    name: input.name,
    version: input.version,
    moduleId: input.moduleId,
    ownerContextId: input.ownerContextId,
    actorUserId: input.actorUserId,
    occurredAt: input.occurredAt ?? now().toISOString(),
    severity: input.severity ?? "info",
    dedupeKey: input.dedupeKey,
    payload: input.payload,
  };
}

export function validateEventEnvelope(e: EventEnvelope): string[] {
  const errors: string[] = [];
  if (e.contractVersion !== CONTRACT_VERSION) errors.push("Okänd kontraktsversion.");
  if (!/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/.test(e.name))
    errors.push(`Ogiltigt händelsenamn: ${e.name}`);
  if (!e.ownerContextId) errors.push("ownerContextId saknas.");
  if (Number.isNaN(new Date(e.occurredAt).getTime())) errors.push("Ogiltig occurredAt.");
  return errors;
}
