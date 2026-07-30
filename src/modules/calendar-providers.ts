// =====================================================================
// src/modules/calendar-providers.ts
// Skalets kompositionspunkt: kopplar in modulernas kalenderleverantörer.
// Importerar ENDAST modulernas publika yta. Kalendern importerar den här
// filen — aldrig en modul direkt.
// =====================================================================

import { registerCalendarProvider } from "@/platform/calendar-provider";
import { trainingCalendarProvider } from "./training";

let wired = false;

export function registerModuleCalendarProviders(): void {
  if (wired) return;
  wired = true;
  registerCalendarProvider(trainingCalendarProvider);
}

// Registrering sker vid import så att kalendern alltid ser providers.
registerModuleCalendarProviders();
