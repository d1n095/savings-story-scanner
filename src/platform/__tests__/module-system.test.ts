import { describe, expect, it } from "vitest";
import {
  createModuleRegistry,
  createModuleRuntime,
  defineLifeModule,
  isApiCompatible,
  lifeStoreCatalog,
  preinstalledModules,
  satisfiesCaret,
  validateLifeModuleManifest,
  workModule,
  financeModule,
  type CommandEnvelope,
  type EventEnvelope,
  type InstalledModule,
  type LifeModuleManifest,
} from "@/platform";

const NOW = new Date("2026-07-30T12:00:00.000Z");

function installed(manifest: LifeModuleManifest, over: Partial<InstalledModule> = {}): InstalledModule {
  return {
    manifest,
    state: "enabled",
    grantedPermissions: manifest.permissions.map((p) => p.permission),
    installedAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    ...over,
  };
}

describe("Life Module SDK", () => {
  it("validerar hela katalogen", () => {
    for (const m of lifeStoreCatalog) expect(validateLifeModuleManifest(m)).toEqual([]);
  });

  it("avvisar manifest utan motivering till behörighet", () => {
    const errors = validateLifeModuleManifest({
      ...workModule,
      permissions: [{ permission: "shifts:read", reason: "", required: true }],
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("kastar när defineLifeModule får ogiltigt id", () => {
    expect(() => defineLifeModule({ ...workModule, id: "Work Module" })).toThrow();
  });

  it("caret-range fungerar", () => {
    expect(satisfiesCaret("1.2.0", "^1.0.0")).toBe(true);
    expect(satisfiesCaret("2.0.0", "^1.0.0")).toBe(false);
    expect(satisfiesCaret("1.0.0", "^1.2.0")).toBe(false);
  });

  it("nekar modul byggd mot nyare API", () => {
    expect(isApiCompatible({ ...workModule, apiVersion: "2.0.0" })).toBe(false);
    expect(isApiCompatible({ ...workModule, apiVersion: "1.9.0" })).toBe(false);
    expect(isApiCompatible(workModule)).toBe(true);
  });
});

describe("Modulregistret", () => {
  it("installerar, inaktiverar och avinstallerar", () => {
    const reg = createModuleRegistry();
    const r = reg.install({
      manifest: financeModule,
      grantedPermissions: ["finance:read", "finance:write"],
      now: NOW,
    });
    expect(r.ok).toBe(true);
    expect(reg.disable("finance").ok).toBe(true);
    expect(reg.get("finance")!.state).toBe("disabled");
    expect(reg.uninstall("finance").ok).toBe(true);
    expect(reg.get("finance")).toBeUndefined();
  });

  it("nekar behörighet som modulen inte begärt", () => {
    const reg = createModuleRegistry();
    const r = reg.install({
      manifest: financeModule,
      grantedPermissions: ["finance:read", "finance:write", "shifts:write"],
    });
    expect(r).toMatchObject({ ok: false, code: "permission_not_requested" });
  });

  it("kräver obligatoriska behörigheter", () => {
    const reg = createModuleRegistry();
    const r = reg.install({ manifest: financeModule, grantedPermissions: ["finance:read"] });
    expect(r).toMatchObject({ ok: false, code: "missing_required_permission" });
  });

  it("nekar installation av inkompatibel modul", () => {
    const reg = createModuleRegistry();
    const r = reg.install({
      manifest: { ...financeModule, apiVersion: "2.0.0" },
      grantedPermissions: ["finance:read", "finance:write"],
    });
    expect(r).toMatchObject({ ok: false, code: "incompatible_api" });
  });

  it("skyddar moduler som andra beror på", () => {
    const dependent = defineLifeModule({
      ...financeModule,
      id: "budget",
      dependencies: [{ moduleId: "work", range: "^1.0.0" }],
    });
    const reg = createModuleRegistry([installed(workModule), installed(dependent)]);
    expect(reg.uninstall("work")).toMatchObject({ ok: false, code: "dependency_in_use" });
  });

  it("kan rulla tillbaka en trasig uppdatering", () => {
    const reg = createModuleRegistry([installed(financeModule)]);
    expect(reg.update({ ...financeModule, version: "1.1.0" }).ok).toBe(true);
    expect(reg.get("finance")!.manifest.version).toBe("1.1.0");
    reg.markFailed("finance", "Kraschar vid start");
    expect(reg.get("finance")!.state).toBe("failed");
    expect(reg.rollback("finance").ok).toBe(true);
    expect(reg.get("finance")!.manifest.version).toBe("1.0.0");
    expect(reg.get("finance")!.state).toBe("enabled");
  });

  it("blockerar nedgradering", () => {
    const reg = createModuleRegistry([installed({ ...financeModule, version: "1.2.0" })]);
    expect(reg.update({ ...financeModule, version: "1.0.0" })).toMatchObject({
      ok: false,
      code: "downgrade_blocked",
    });
  });

  it("listar bara routes för aktiverade moduler", () => {
    const reg = createModuleRegistry(preinstalledModules.map((m) => installed(m)));
    reg.disable("planning");
    const paths = reg.activeRoutes().map((r) => r.path);
    expect(paths).toContain("/kalender");
    expect(paths).not.toContain("/planering");
  });
});

describe("Life Module Runtime", () => {
  const reg = createModuleRegistry([
    installed(workModule),
    installed(financeModule, { state: "disabled" }),
  ]);
  const rt = createModuleRuntime({ registry: reg, now: () => NOW });

  it("tillåter deklarerad route men inte odeklarerad", () => {
    expect(rt.canRegisterRoute("work", "/jobb").allowed).toBe(true);
    expect(rt.canRegisterRoute("work", "/pengar")).toMatchObject({
      allowed: false,
      reason: "route_not_declared",
    });
  });

  it("nekar inaktiverad modul", () => {
    expect(rt.canAccess("finance", "finance:read")).toMatchObject({
      allowed: false,
      reason: "module_disabled",
    });
  });

  it("hindrar åtkomst till annan moduls data", () => {
    expect(rt.canAccessDataScope("work", "shifts:row").allowed).toBe(true);
    expect(rt.canAccessDataScope("work", "finance:row")).toMatchObject({
      allowed: false,
      reason: "foreign_data_scope",
    });
  });

  it("släpper bara igenom deklarerade events och kommandon", () => {
    const evt = { name: "expense.created" } as EventEnvelope;
    expect(rt.canConsumeEvent("work", evt)).toMatchObject({ allowed: false });
    expect(rt.canPublishEvent("work", "shift.created").allowed).toBe(true);

    const cmd = { name: "shift.create" } as CommandEnvelope;
    expect(rt.canReceiveCommand("work", cmd).allowed).toBe(true);
    expect(rt.canReceiveCommand("work", { name: "finance.pay" } as CommandEnvelope)).toMatchObject({
      allowed: false,
      reason: "command_not_supported",
    });
  });

  it("nekar alltid hemligheter och loggar försöket", () => {
    expect(rt.canReadSecret("work", "GEMINI_API_KEY")).toMatchObject({
      allowed: false,
      reason: "secret_access_denied",
    });
    const last = rt.audit().at(-1)!;
    expect(last).toMatchObject({ moduleId: "work", action: "secret", allowed: false });
  });

  it("nekar okänd modul", () => {
    expect(rt.canAccess("okand", "finance:read")).toMatchObject({
      allowed: false,
      reason: "module_unknown",
    });
  });
});
