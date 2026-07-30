// =====================================================================
// src/modules/training/hooks.ts
// Modulägda hooks. All dataåtkomst går genom service.ts.
// =====================================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as service from "./service";
import type { SessionDetail, TrainingResult, WorkoutTemplate } from "./types";

export const TRAINING_TEMPLATES_KEY = ["training", "templates"] as const;
export const TRAINING_SESSIONS_KEY = ["training", "sessions"] as const;

function unwrap<T>(result: TrainingResult<T>): T {
  if (!result.ok) throw new Error(result.message);
  return result.value;
}

export function useTrainingTemplates() {
  return useQuery<WorkoutTemplate[]>({
    queryKey: TRAINING_TEMPLATES_KEY,
    queryFn: async () => unwrap(await service.listTemplates()),
    staleTime: 15_000,
  });
}

export function useTrainingSessions() {
  return useQuery<SessionDetail[]>({
    queryKey: TRAINING_SESSIONS_KEY,
    queryFn: async () => unwrap(await service.listSessions()),
    staleTime: 15_000,
  });
}

/**
 * Kör en mutation och visar aldrig lyckat innan databasen bekräftat.
 * Invalidering sker först efter bekräftad skrivning.
 */
export function useTrainingMutation<TArgs, TValue>(
  run: (args: TArgs) => Promise<TrainingResult<TValue>>,
  successText: string,
) {
  const qc = useQueryClient();
  return useMutation<TValue, Error, TArgs>({
    mutationFn: async (args) => unwrap(await run(args)),
    onSuccess: () => {
      toast.success(successText);
      void qc.invalidateQueries({ queryKey: ["training"] });
      // Kalendern läser träningspass via kalenderkontraktet — uppdatera den också.
      void qc.invalidateQueries({ queryKey: ["calendar", "module-contributions"] });
    },
    onError: (error) => {
      toast.error("Det gick inte", { description: error.message });
    },
  });
}
