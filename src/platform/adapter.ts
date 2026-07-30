// =====================================================================
// src/platform/adapter.ts
// Isolerad integrationsadapter. INTE kopplad till någon affärslogik.
// createLocalAdapter() är helt lokal: kö i minnet, inga nätverksanrop,
// inga API-nycklar, inga externa tjänster. Ingen modul importerar denna
// fil ännu — den finns för att Fas II–IV ska kunna kopplas in senare.
// =====================================================================

import type { AppManifest } from "./contracts";
import type { CommandEnvelope, CommandResult } from "./commands";
import type { EventEnvelope } from "./events";
import { validateEventEnvelope } from "./events";

export type AdapterState = "disconnected" | "local" | "connected";

export interface PlatformAdapter {
  readonly state: AdapterState;
  /** Manifestet LifeApp exponerar mot LifeOS. */
  describe(): AppManifest;
  /** Köa en utgående händelse. Levereras inte förrän Fas III. */
  publish(event: EventEnvelope): Promise<void>;
  /** Ta emot ett kommando. Lokal adapter avvisar allt med not_implemented. */
  dispatch(command: CommandEnvelope): Promise<CommandResult>;
  /** Händelser som ligger och väntar på leverans. */
  pending(): readonly EventEnvelope[];
  /** Töm kön (används av tester och av framtida leveranslager). */
  drain(): EventEnvelope[];
}

export interface LocalAdapterOptions {
  manifest: AppManifest;
  /** Max antal köade händelser innan de äldsta släpps. */
  maxQueue?: number;
}

/**
 * Lokal, inert adapter. Gör aldrig I/O.
 */
export function createLocalAdapter(options: LocalAdapterOptions): PlatformAdapter {
  const maxQueue = options.maxQueue ?? 500;
  const queue: EventEnvelope[] = [];
  const seenDedupeKeys = new Set<string>();

  return {
    state: "local",

    describe() {
      return options.manifest;
    },

    async publish(event) {
      const errors = validateEventEnvelope(event);
      if (errors.length > 0) throw new Error(`Ogiltig händelse: ${errors.join("; ")}`);
      if (event.dedupeKey) {
        if (seenDedupeKeys.has(event.dedupeKey)) return;
        seenDedupeKeys.add(event.dedupeKey);
      }
      queue.push(event);
      while (queue.length > maxQueue) queue.shift();
    },

    async dispatch(command) {
      return {
        ok: false,
        commandId: command.commandId,
        code: "not_implemented",
        message: "Kommandoingången aktiveras först i Fas IV (se docs/LIFEOS_INTEGRATION_PLAN.md).",
      };
    },

    pending() {
      return queue;
    },

    drain() {
      return queue.splice(0, queue.length);
    },
  };
}
