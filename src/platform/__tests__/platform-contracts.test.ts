import { describe, expect, it } from "vitest";
import {
  CONTRACT_VERSION,
  createEventEnvelope,
  createLocalAdapter,
  evaluateCommand,
  lifeAppManifest,
  validateAppManifest,
  validateEventEnvelope,
  type CommandEnvelope,
  type CommandPolicy,
} from "@/platform";

const NOW = new Date("2026-07-30T12:00:00.000Z");

function envelope(over: Partial<CommandEnvelope> = {}): CommandEnvelope {
  return {
    contractVersion: CONTRACT_VERSION,
    commandId: "cmd-1",
    name: "shift.create",
    version: "1.0.0",
    origin: "lifeos",
    actorChain: ["lifeai", "lifeos"],
    ownerContextId: "ctx-1",
    issuedAt: NOW.toISOString(),
    nonce: "n1",
    payload: {},
    ...over,
  };
}

const policy: CommandPolicy = {
  name: "shift.create",
  requiredPermissions: ["shifts:write"],
  requiresApproval: true,
  maxAgeSeconds: 300,
};

const ctx = (over: Partial<Parameters<typeof evaluateCommand>[2]> = {}) => ({
  grantedPermissions: ["shifts:write" as const],
  approved: true,
  seenNonces: new Set<string>(),
  now: NOW,
  ...over,
});

describe("LifeApp-manifest", () => {
  it("är strukturellt giltigt", () => {
    expect(validateAppManifest(lifeAppManifest)).toEqual([]);
  });

  it("markerar main-ai som prototyp och bygger inte ut den", () => {
    const proto = lifeAppManifest.modules.find((m) => m.id === "main-ai-prototype");
    expect(proto).toBeDefined();
    expect(proto!.commands).toEqual([]);
    expect(proto!.capabilities).toEqual(["read"]);
  });

  it("innehåller alla befintliga huvudroutes", () => {
    const paths = lifeAppManifest.modules.flatMap((m) => m.routes.map((r) => r.path));
    for (const p of ["/jobb", "/pengar", "/kalender", "/idag", "/planering", "/importera"]) {
      expect(paths).toContain(p);
    }
  });
});

describe("Kommandopolicy (LifeAI föreslår, LifeApp verkställer)", () => {
  it("godkänner ett komplett kommando", () => {
    expect(evaluateCommand(envelope(), policy, ctx()).ok).toBe(true);
  });

  it("avvisar okänt kommando", () => {
    const r = evaluateCommand(envelope({ name: "x.y" }), undefined, ctx());
    expect(r).toMatchObject({ ok: false, code: "unknown_command" });
  });

  it("avvisar saknad behörighet", () => {
    const r = evaluateCommand(envelope(), policy, ctx({ grantedPermissions: [] }));
    expect(r).toMatchObject({ ok: false, code: "missing_permission" });
  });

  it("kräver godkännande för destruktiva kommandon", () => {
    const r = evaluateCommand(envelope(), policy, ctx({ approved: false }));
    expect(r).toMatchObject({ ok: false, code: "approval_required" });
  });

  it("avvisar replay", () => {
    const r = evaluateCommand(envelope(), policy, ctx({ seenNonces: new Set(["n1"]) }));
    expect(r).toMatchObject({ ok: false, code: "replayed" });
  });

  it("avvisar för gammalt kommando", () => {
    const r = evaluateCommand(
      envelope({ issuedAt: new Date(NOW.getTime() - 3_600_000).toISOString() }),
      policy,
      ctx(),
    );
    expect(r).toMatchObject({ ok: false, code: "expired" });
  });
});

describe("Händelsekuvert", () => {
  it("skapas med kontraktsversion och validerar", () => {
    const e = createEventEnvelope(
      {
        name: "shift.created",
        version: "1.0.0",
        moduleId: "work",
        ownerContextId: "ctx-1",
        payload: { id: "s1" },
      },
      () => "evt-1",
      () => NOW,
    );
    expect(e.contractVersion).toBe(CONTRACT_VERSION);
    expect(validateEventEnvelope(e)).toEqual([]);
  });

  it("underkänner ogiltigt namn", () => {
    const e = createEventEnvelope(
      { name: "Ogiltigt", version: "1.0.0", moduleId: "work", ownerContextId: "c", payload: {} },
      () => "evt-2",
      () => NOW,
    );
    expect(validateEventEnvelope(e).length).toBeGreaterThan(0);
  });
});

describe("Lokal adapter är inert", () => {
  const adapter = createLocalAdapter({ manifest: lifeAppManifest });

  it("kör inga kommandon", async () => {
    const r = await adapter.dispatch(envelope());
    expect(r).toMatchObject({ ok: false, code: "not_implemented" });
  });

  it("köar händelser lokalt utan leverans och deduplicerar", async () => {
    const make = (n: number) =>
      createEventEnvelope(
        {
          name: "shift.created",
          version: "1.0.0",
          moduleId: "work",
          ownerContextId: "ctx-1",
          dedupeKey: "same",
          payload: { n },
        },
        () => `evt-${n}`,
        () => NOW,
      );
    await adapter.publish(make(1));
    await adapter.publish(make(2));
    expect(adapter.pending()).toHaveLength(1);
    expect(adapter.drain()).toHaveLength(1);
    expect(adapter.pending()).toHaveLength(0);
  });
});
