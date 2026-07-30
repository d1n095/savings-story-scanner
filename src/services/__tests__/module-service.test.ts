import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Minimal, styrbar Supabase-dubbel ------------------------------------
type State = {
  user: { id: string } | null;
  rows: Record<string, unknown>[];
  failNext: string | null;
};

const state: State = { user: { id: "user-a" }, rows: [], failNext: null };
const auditInserts: Record<string, unknown>[] = [];

function tableApi(table: string) {
  if (table === "module_audit_events") {
    return {
      insert: (v: Record<string, unknown>) => {
        auditInserts.push(v);
        return Promise.resolve({ data: null, error: null });
      },
      select: () => ({
        order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }),
      }),
    };
  }
  const err = (op: string) => (state.failNext === op ? { message: "network down" } : null);

  return {
    select: () => {
      const error = err("select");
      // RLS simuleras: bara rader som tillhör den inloggade användaren returneras.
      const data = state.rows.filter((r) => r.user_id === state.user?.id);
      return Promise.resolve({ data: error ? null : data, error });
    },
    insert: (v: Record<string, unknown>) => ({
      select: () => ({
        single: () => {
          const error = err("insert");
          if (!error) state.rows.push({ ...v, installed_at: "t", updated_at: "t", settings: {} });
          return Promise.resolve({
            data: error ? null : { ...v, installed_at: "t", updated_at: "t", settings: {} },
            error,
          });
        },
      }),
    }),
    upsert: (v: Record<string, unknown>) => {
      const error = err("upsert");
      if (!error) {
        const i = state.rows.findIndex(
          (r) => r.user_id === v.user_id && r.module_id === v.module_id,
        );
        const next = { ...v, installed_at: "t", updated_at: "t", settings: {} };
        if (i >= 0) state.rows[i] = next;
        else state.rows.push(next);
      }
      const result = {
        data: error ? null : { ...v, installed_at: "t", updated_at: "t", settings: {} },
        error,
      };
      return {
        select: () => ({ single: () => Promise.resolve(result) }),
        then: (r: (x: typeof result) => unknown) => Promise.resolve(result).then(r),
      };
    },
    delete: () => ({
      eq: (_col: string, id: string) => {
        const error = err("delete");
        if (!error)
          state.rows = state.rows.filter(
            (r) => !(r.module_id === id && r.user_id === state.user?.id),
          );
        return Promise.resolve({ data: null, error });
      },
    }),
  };
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: () => Promise.resolve({ data: { user: state.user }, error: null }) },
    from: (table: string) => tableApi(table),
  },
}));

const {
  installModule,
  enableModule,
  disableModule,
  uninstallModule,
  listInstallations,
  listModuleViews,
} = await import("@/services/module-service");

beforeEach(() => {
  state.user = { id: "user-a" };
  state.rows = [];
  state.failNext = null;
  auditInserts.length = 0;
});

describe("behörighet", () => {
  it("utloggad användare nekas", async () => {
    state.user = null;
    for (const fn of [
      () => listInstallations(),
      () => installModule("health"),
      () => enableModule("health"),
      () => disableModule("health"),
      () => uninstallModule("health"),
    ]) {
      const r = await fn();
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe("unauthorized");
    }
  });

  it("en användare ser aldrig en annan användares rader", async () => {
    state.rows.push({
      user_id: "user-b",
      module_id: "health",
      version: "0.1.0",
      status: "installed",
      enabled: true,
      granted_permissions: [],
      failure_reason: null,
      installed_at: "t",
      updated_at: "t",
      settings: {},
    });
    const mine = await listInstallations();
    expect(mine.ok && mine.value).toEqual([]);

    // user-b ser sin egen rad
    state.user = { id: "user-b" };
    const theirs = await listInstallations();
    expect(theirs.ok && theirs.value.map((r) => r.moduleId)).toEqual(["health"]);
  });
});

describe("livscykel", () => {
  it("installation persisteras och överlever ny uppslagning", async () => {
    const r = await installModule("health");
    expect(r.ok).toBe(true);
    const again = await listInstallations();
    expect(again.ok && again.value.map((x) => x.moduleId)).toEqual(["health"]);
  });

  it("inaktivering och återaktivering ändrar tillståndet", async () => {
    await installModule("health");
    expect((await disableModule("health")).ok).toBe(true);
    let views = await listModuleViews();
    expect(views.ok && views.value.find((v) => v.manifest.id === "health")?.state).toBe("disabled");

    expect((await enableModule("health")).ok).toBe(true);
    views = await listModuleViews();
    expect(views.ok && views.value.find((v) => v.manifest.id === "health")?.state).toBe("enabled");
  });

  it("kärnmodul kan varken stängas av eller avinstalleras", async () => {
    const disabled = await disableModule("calendar");
    expect(disabled.ok).toBe(false);
    if (!disabled.ok) expect(disabled.code).toBe("required_module");

    const removed = await uninstallModule("finance");
    expect(removed.ok).toBe(false);
    if (!removed.ok) expect(removed.code).toBe("required_module");
  });

  it("valfri medföljande modul kan avinstalleras och blir tillgänglig igen", async () => {
    const r = await uninstallModule("planning");
    expect(r.ok).toBe(true);
    const views = await listModuleViews();
    const planning = views.ok && views.value.find((v) => v.manifest.id === "planning");
    expect(planning && planning.state).toBe("available");
  });

  it("avinstallerad medföljande modul kan installeras om", async () => {
    expect((await uninstallModule("planning")).ok).toBe(true);
    const again = await installModule("planning");
    expect(again.ok).toBe(true);
    const views = await listModuleViews();
    expect(views.ok && views.value.find((v) => v.manifest.id === "planning")?.state).toBe(
      "enabled",
    );
  });

  it("misslyckad persistens ger fel och rapporterar aldrig lyckat", async () => {
    state.failNext = "upsert";
    const r = await installModule("health");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("persistence_failed");
    expect(state.rows).toEqual([]);
  });

  it("läsfel rapporteras som persistence_failed", async () => {
    state.failNext = "select";
    const r = await listInstallations();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("persistence_failed");
  });
});

describe("auditlogg", () => {
  it("varje livscykelåtgärd loggas med utfall", async () => {
    await installModule("health");
    await disableModule("health");
    await disableModule("calendar"); // nekas
    const actions = auditInserts.map((a) => [a.module_id, a.action, a.success]);
    expect(actions).toEqual([
      ["health", "install", true],
      ["health", "disable", true],
      ["calendar", "disable", false],
    ]);
  });
});
