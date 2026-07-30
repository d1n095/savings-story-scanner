// Tester för kalenderleverantörskontraktet och Träning → Kalender-integrationen.
import { beforeEach, describe, expect, it } from "vitest";
import {
  activeCalendarProviders,
  clearCalendarProviders,
  collectCalendarContributions,
  listCalendarProviders,
  registerCalendarProvider,
  unregisterCalendarProvider,
  type CalendarProvider,
  type CalendarRange,
} from "@/platform/calendar-provider";
import { sessionsToCalendarContributions } from "@/modules/training";
import { buildDayIndex, isoDateLocal } from "@/modules/calendar/source";
import type { TrainingSession } from "@/modules/training";

const range: CalendarRange = { startDate: "2026-03-01", endDate: "2026-03-31" };

function session(over: Partial<TrainingSession> = {}): TrainingSession {
  return {
    id: over.id ?? "s1",
    templateId: null,
    title: "Ben och rygg",
    scheduledOn: "2026-03-10",
    scheduledTime: "18:30:00",
    status: "planned",
    completedAt: null,
    durationMin: null,
    perceivedEffort: null,
    notes: null,
    createdAt: "",
    updatedAt: "",
    ...over,
  };
}

function provider(over: Partial<CalendarProvider> = {}): CalendarProvider {
  return {
    id: "test.provider",
    moduleId: "training",
    label: "Träning",
    load: async () => [
      { id: "a", date: "2026-03-10", title: "Pass", tone: "planned" },
    ],
    ...over,
  };
}

beforeEach(() => clearCalendarProviders());

describe("kalenderleverantörsregistret", () => {
  it("registrerar och avregistrerar providers", () => {
    registerCalendarProvider(provider());
    expect(listCalendarProviders()).toHaveLength(1);
    unregisterCalendarProvider("test.provider");
    expect(listCalendarProviders()).toHaveLength(0);
  });

  it("räknar bara providers vars modul är aktiv", () => {
    registerCalendarProvider(provider());
    expect(activeCalendarProviders(["training"])).toHaveLength(1);
    expect(activeCalendarProviders(["finance"])).toHaveLength(0);
  });

  it("ger inga bidrag när modulen är inaktiverad", async () => {
    registerCalendarProvider(provider());
    const { contributions } = await collectCalendarContributions([], range);
    expect(contributions).toEqual([]);
  });

  it("utesluter bidrag utanför intervallet", async () => {
    registerCalendarProvider(
      provider({ load: async () => [{ id: "x", date: "2026-04-02", title: "Pass", tone: "planned" }] }),
    );
    const { contributions } = await collectCalendarContributions(["training"], range);
    expect(contributions).toEqual([]);
  });

  it("isolerar fel: en trasig provider sänker inte kalendern", async () => {
    registerCalendarProvider(provider({ id: "bad", load: async () => { throw new Error("nej"); } }));
    registerCalendarProvider(provider({ id: "good" }));
    const { contributions, failed } = await collectCalendarContributions(["training"], range);
    expect(failed).toEqual(["training"]);
    expect(contributions).toHaveLength(1);
  });
});

describe("träningspass som kalenderbidrag", () => {
  it("mappar status till ton och djuplänk", () => {
    const items = sessionsToCalendarContributions(
      [
        session({ id: "p", status: "planned" }),
        session({ id: "c", status: "completed" }),
        session({ id: "x", status: "cancelled" }),
      ],
      range,
    );
    expect(items.map((i) => i.tone)).toEqual(["planned", "done", "cancelled"]);
    expect(items[0].deepLink).toBe("/traning/pass");
    expect(items[1].deepLink).toBe("/traning/historik");
    expect(items[0].time).toBe("18:30");
    expect(items[0].sourceTable).toBe("training_sessions");
  });

  it("filtrerar bort pass utanför intervallet", () => {
    const items = sessionsToCalendarContributions(
      [session({ id: "in" }), session({ id: "out", scheduledOn: "2026-02-02" })],
      range,
    );
    expect(items.map((i) => i.id)).toEqual(["in"]);
  });

  it("hanterar pass utan tid", () => {
    const [item] = sessionsToCalendarContributions([session({ scheduledTime: null })], range);
    expect(item.time).toBeUndefined();
  });
});

describe("kalendern renderar modulbidrag", () => {
  const start = new Date(2026, 2, 1);
  const end = new Date(2026, 2, 31);

  it("lägger bidraget på rätt dag med djuplänk", () => {
    const contributions = sessionsToCalendarContributions([session()], range).map((c) => ({
      ...c,
      moduleId: "training",
      providerId: "training.sessions",
      providerLabel: "Träning",
    }));
    const index = buildDayIndex(start, end, { contributions });
    const day = index.get("2026-03-10");
    const event = day?.events.find((e) => e.kind === "module");
    expect(event?.title).toBe("Ben och rygg");
    expect(event?.deepLink).toBe("/traning/pass");
    expect(event?.groupLabel).toBe("Träning");
    // Ekonomiska summor påverkas inte av träningspass.
    expect(day?.totals.gross).toBe(0);
  });

  it("visar inga modulhändelser utan bidrag", () => {
    const index = buildDayIndex(start, end, {});
    const all = [...index.values()].flatMap((d) => d.events);
    expect(all.some((e) => e.kind === "module")).toBe(false);
  });

  it("isoDateLocal använder lokal tid", () => {
    expect(isoDateLocal(new Date(2026, 2, 10))).toBe("2026-03-10");
  });
});
