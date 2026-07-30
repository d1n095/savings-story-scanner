// =====================================================================
// src/hooks/use-calendar-contributions.ts
// Läser modulbidrag till kalendern. Endast installerade och aktiva
// moduler får bidra — inaktivering döljer posterna direkt.
// =====================================================================

import { useQuery } from "@tanstack/react-query";
import {
  collectCalendarContributions,
  type CalendarProviderContribution,
  type CalendarRange,
} from "@/platform/calendar-provider";
import "@/modules/calendar-providers";
import { useModuleViews } from "./use-modules";

export const CALENDAR_CONTRIBUTIONS_KEY = ["calendar", "module-contributions"] as const;

export function useCalendarContributions(range: CalendarRange) {
  const views = useModuleViews();

  const enabledModuleIds = (views.data ?? [])
    .filter((v) => v.state === "enabled")
    .map((v) => v.manifest.id);

  return useQuery<CalendarProviderContribution[]>({
    queryKey: [...CALENDAR_CONTRIBUTIONS_KEY, range.startDate, enabledModuleIds.join(",")],
    enabled: views.isSuccess,
    queryFn: async () => {
      const { contributions } = await collectCalendarContributions(enabledModuleIds, range);
      return contributions;
    },
    staleTime: 15_000,
  });
}
