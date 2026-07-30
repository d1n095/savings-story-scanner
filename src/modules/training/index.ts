// =====================================================================
// src/modules/training/index.ts
// Modulens ENDA publika yta. Skalet och andra moduler får bara importera
// härifrån — aldrig från interna filer.
// =====================================================================

export { trainingModule, TRAINING_MODULE_ID } from "./module";

// Vyer som skalet monterar på modulens deklarerade routes.
export { TrainingOverview } from "./components/TrainingOverview";
export { TrainingPlanView } from "./components/TrainingPlanView";
export { TrainingHistoryView } from "./components/TrainingHistoryView";

// Ren, testbar domänlogik.
export {
  summarize,
  sessionVolumeKg,
  sessionDistanceKm,
  sessionSetCount,
  plannedForDate,
  plannedFromDate,
  upcomingPlanned,
  recentCompleted,
  isoDate,
  startOfWeek,
  endOfWeek,
  type TrainingSummary,
} from "./summary";

export type {
  ExerciseType,
  SessionStatus,
  WorkoutTemplate,
  TemplateExercise,
  TrainingSession,
  SessionDetail,
  SessionExercise,
  LoggedSet,
  TrainingResult,
} from "./types";

export { setTrainingEventSink, buildTrainingEvent, type TrainingEventName } from "./events";
