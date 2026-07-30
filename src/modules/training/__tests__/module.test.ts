// =====================================================================
// src/modules/training/__tests__/module.test.ts
// Manifest-, isolerings- och beräkningstester för träningsmodulen.
// =====================================================================

import { describe, expect, it } from "vitest";
import { trainingModule, TRAINING_MODULE_ID } from "../module";
import { validateLifeModuleManifest, isApiCompatible } from "@/platform/module-sdk";
import { lifeStoreCatalog } from "@/modules/catalog";
import {
  isoDate,
  plannedForDate,
  plannedFromDate,
  recentCompleted,
  sessionDistanceKm,
  sessionSetCount,
  sessionVolumeKg,
  summarize,
  upcomingPlanned,
} from "../summary";
import { buildTrainingEvent } from "../events";
import type { SessionDetail, SessionExercise } from "../types";

function ex(partial: Partial<SessionExercise> = {}): SessionExercise {
  return {
    id: partial.id ?? "ex-1",
    sessionId: partial.sessionId ?? "s-1",
    name: partial.name ?? "Knäböj",
    exerciseType: partial.exerciseType ?? "strength",
    sortOrder: partial.sortOrder ?? 0,
    sets: partial.sets ?? [],
  };
}

function session(partial: Partial<SessionDetail> = {}): SessionDetail {
  return {
    id: partial.id ?? "s-1",
    templateId: partial.templateId ?? null,
    title: partial.title ?? "Pass",
    scheduledOn: partial.scheduledOn ?? "2026-07-30",
    scheduledTime: partial.scheduledTime ?? null,
    status: partial.status ?? "completed",
    completedAt: partial.completedAt ?? null,
    durationMin: partial.durationMin ?? null,
    perceivedEffort: partial.perceivedEffort ?? null,
    notes: partial.notes ?? null,
    createdAt: partial.createdAt ?? "2026-07-30T00:00:00Z",
    updatedAt: partial.updatedAt ?? "2026-07-30T00:00:00Z",
    exercises: partial.exercises ?? [],
  };
}

describe("träningsmodulens manifest", () => {
  it("validerar utan fel", () => {
    expect(validateLifeModuleManifest(trainingModule)).toEqual([]);
  });

  it("är kompatibelt med kärnans API-version", () => {
    expect(isApiCompatible(trainingModule)).toBe(true);
  });

  it("deklarerar exakt de routes skalet monterar", () => {
    expect(trainingModule.routes.map((r) => r.path)).toEqual([
      "/traning",
      "/traning/pass",
      "/traning/historik",
    ]);
  });

  it("begär bara egna behörigheter", () => {
    for (const p of trainingModule.permissions)
      expect(p.permission.startsWith("training:")).toBe(true);
  });

  it("finns exakt en gång i Life Store-katalogen", () => {
    const matches = lifeStoreCatalog.filter((m) => m.id === TRAINING_MODULE_ID);
    expect(matches).toHaveLength(1);
    expect(matches[0]).toBe(trainingModule);
  });

  it("publicerar bara punktade händelsenamn under sitt eget prefix", () => {
    for (const name of trainingModule.eventsPublished)
      expect(name.startsWith("training.")).toBe(true);
  });
});

describe("beräkningar", () => {
  it("räknar volym som reps × vikt", () => {
    const exercises = [
      ex({
        sets: [
          {
            id: "1",
            sessionExerciseId: "ex-1",
            setIndex: 0,
            reps: 10,
            weightKg: 50,
            durationMin: null,
            distanceKm: null,
          },
          {
            id: "2",
            sessionExerciseId: "ex-1",
            setIndex: 1,
            reps: 8,
            weightKg: 60,
            durationMin: null,
            distanceKm: null,
          },
        ],
      }),
    ];
    expect(sessionVolumeKg(exercises)).toBe(980);
    expect(sessionSetCount(exercises)).toBe(2);
  });

  it("ignorerar set utan vikt i volymen", () => {
    const exercises = [
      ex({
        exerciseType: "cardio",
        sets: [
          {
            id: "1",
            sessionExerciseId: "ex-1",
            setIndex: 0,
            reps: null,
            weightKg: null,
            durationMin: 30,
            distanceKm: 5.5,
          },
        ],
      }),
    ];
    expect(sessionVolumeKg(exercises)).toBe(0);
    expect(sessionDistanceKm(exercises)).toBe(5.5);
  });

  it("summerar bara genomförda pass", () => {
    const summary = summarize(
      [
        session({ id: "a", status: "completed", durationMin: 45 }),
        session({ id: "b", status: "planned", durationMin: 60 }),
        session({ id: "c", status: "cancelled", durationMin: 60 }),
      ],
      new Date("2026-07-30T12:00:00Z"),
    );
    expect(summary.totalSessions).toBe(1);
    expect(summary.totalMinutes).toBe(45);
  });

  it("filtrerar planerade pass på datum och framtid", () => {
    const list = [
      session({ id: "a", status: "planned", scheduledOn: "2026-07-30" }),
      session({ id: "b", status: "planned", scheduledOn: "2026-08-02" }),
      session({ id: "c", status: "completed", scheduledOn: "2026-07-30" }),
    ];
    expect(plannedForDate(list, "2026-07-30").map((s) => s.id)).toEqual(["a"]);
    expect(upcomingPlanned(list, "2026-07-31").map((s) => s.id)).toEqual(["b"]);
    expect(recentCompleted(list).map((s) => s.id)).toEqual(["c"]);
  });

  it("tar med pass som planerats för idag i planeringsvyn", () => {
    const list = [
      session({ id: "a", status: "planned", scheduledOn: "2026-07-30" }),
      session({ id: "b", status: "planned", scheduledOn: "2026-08-02" }),
      session({ id: "c", status: "cancelled", scheduledOn: "2026-08-03" }),
    ];
    expect(plannedFromDate(list, "2026-07-30").map((s) => s.id)).toEqual(["a", "b"]);
    expect(plannedFromDate(list, "2026-08-01").map((s) => s.id)).toEqual(["b"]);
  });


  it("formaterar datum som ISO-dag", () => {
    expect(isoDate(new Date("2026-07-30T22:15:00Z"))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("händelser", () => {
  it("byggs med modulens id som källa och deklarerat namn", () => {
    const envelope = buildTrainingEvent("training.session.completed", "user-1", {
      sessionId: "s-1",
      title: "Pass",
      scheduledOn: "2026-07-30",
    });
    expect(trainingModule.eventsPublished).toContain(envelope.name);
    expect(envelope.payload.sessionId).toBe("s-1");
    expect(envelope.moduleId).toBe(TRAINING_MODULE_ID);
  });
});
