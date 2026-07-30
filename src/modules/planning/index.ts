// =====================================================================
// src/modules/planning/index.ts
// Modulens ENDA publika yta. Skalet och andra moduler får bara importera
// härifrån — aldrig från interna filer.
// =====================================================================

export { planningModule, PLANNING_MODULE_ID } from "./module";

// Vyer som skalet monterar på modulens deklarerade routes.
export { PlanningView } from "./components/PlanningView";
export { InsightsView } from "./components/InsightsView";

// Domänlogik (ren, testbar, utan route- eller UI-beroenden).
export { analyzeVacation, type VacationAnalysis } from "./vacation";
export { expandRotation, ROTATION_PRESETS } from "./rotations";
export {
  aggregateRange,
  aggregateByMonth,
  isoDate,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  isoWeekNumber,
  type ShiftRow,
  type AbsenceRow,
} from "./views";
export * from "./tax";
