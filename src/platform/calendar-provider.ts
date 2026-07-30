// =====================================================================
// src/platform/calendar-provider.ts
// Återanvändbart kalenderleverantörskontrakt.
//
// En modul som vill visa sina poster i kalendern registrerar en provider.
// Kalendern läser ALDRIG en annan moduls tabeller — den frågar bara
// registrerade providers om bidrag för ett datumintervall.
//
// Beroendet går alltid: modul -> plattform. Plattformen känner ingen modul.
// =====================================================================

/** Datumintervall i lokala ISO-datum (yyyy-mm-dd), inklusive båda ändar. */
export interface CalendarRange {
  startDate: string;
  endDate: string;
}

/** Semantisk ton — kalendern översätter till egna designtokens. */
export type CalendarContributionTone = "planned" | "done" | "cancelled" | "info";

/** En dagpost som en modul bidrar med till kalendern. */
export interface CalendarContribution {
  /** Unikt inom modulen. Kalendern prefixar med moduleId. */
  id: string;
  /** Lokalt ISO-datum (yyyy-mm-dd). */
  date: string;
  title: string;
  subtitle?: string;
  /** HH:MM om posten har en tid. */
  time?: string;
  tone: CalendarContributionTone;
  /** Intern route i skalet, t.ex. "/traning/pass". */
  deepLink?: string;
  /** Modulens egen tabell/id — endast för spårbarhet, aldrig för skrivning. */
  sourceTable?: string;
  sourceId?: string;
}

export interface CalendarProvider {
  /** Provider-id, unikt i registret. */
  id: string;
  /** Modulen som äger datan. Kalendern visar bidrag endast när modulen är aktiv. */
  moduleId: string;
  /** Etikett för gruppering i kalenderns dagpanel. */
  label: string;
  /** Läser modulens egna poster. Får bara röra modulens egen data. */
  load: (range: CalendarRange) => Promise<CalendarContribution[]>;
}

const providers = new Map<string, CalendarProvider>();

export function registerCalendarProvider(provider: CalendarProvider): void {
  providers.set(provider.id, provider);
}

export function unregisterCalendarProvider(providerId: string): void {
  providers.delete(providerId);
}

export function listCalendarProviders(): CalendarProvider[] {
  return [...providers.values()];
}

/** Endast providers vars modul är installerad och aktiv. */
export function activeCalendarProviders(enabledModuleIds: readonly string[]): CalendarProvider[] {
  return listCalendarProviders().filter((p) => enabledModuleIds.includes(p.moduleId));
}

export function clearCalendarProviders(): void {
  providers.clear();
}

export interface CalendarProviderContribution extends CalendarContribution {
  moduleId: string;
  providerId: string;
  providerLabel: string;
}

/**
 * Hämtar bidrag från alla aktiva providers. En provider som fallerar får
 * aldrig sänka kalendern — dess bidrag utesluts och felet rapporteras.
 */
export async function collectCalendarContributions(
  enabledModuleIds: readonly string[],
  range: CalendarRange,
): Promise<{ contributions: CalendarProviderContribution[]; failed: string[] }> {
  const active = activeCalendarProviders(enabledModuleIds);
  const contributions: CalendarProviderContribution[] = [];
  const failed: string[] = [];

  const results = await Promise.all(
    active.map(async (provider) => {
      try {
        return { provider, items: await provider.load(range) };
      } catch {
        return { provider, items: null };
      }
    }),
  );

  for (const { provider, items } of results) {
    if (!items) {
      failed.push(provider.moduleId);
      continue;
    }
    for (const item of items) {
      if (item.date < range.startDate || item.date > range.endDate) continue;
      contributions.push({
        ...item,
        moduleId: provider.moduleId,
        providerId: provider.id,
        providerLabel: provider.label,
      });
    }
  }

  return { contributions, failed };
}
