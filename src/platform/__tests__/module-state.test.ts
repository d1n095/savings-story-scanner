import { describe, expect, it } from "vitest";
import { lifeStoreCatalog, preinstalledModules, validateLifeModuleManifest } from "@/platform";
import {
  accessiblePaths,
  canDisable,
  canInstall,
  canUninstall,
  dependencyBlock,
  moduleForPath,
  navigableRoutes,
  resolveModuleView,
  resolveModuleViews,
  REQUIRED_MODULE_IDS,
  type ModuleInstallationRecord,
} from "@/platform/module-state";
import type { Permission } from "@/platform";

const PRE = preinstalledModules.map((m) => m.id);
const find = (id: string) => {
  const m = lifeStoreCatalog.find((x) => x.id === id);
  if (!m) throw new Error(`saknar ${id}`);
  return m;
};

function row(
  moduleId: string,
  over: Partial<ModuleInstallationRecord> = {},
): ModuleInstallationRecord {
  const m = find(moduleId);
  return {
    moduleId,
    version: m.version,
    status: "installed",
    enabled: true,
    grantedPermissions: m.permissions.map((p) => p.permission),
    settings: {},
    failureReason: null,
    installedAt: "2026-07-30T00:00:00.000Z",
    updatedAt: "2026-07-30T00:00:00.000Z",
    ...over,
  };
}

const view = (id: string, records: ModuleInstallationRecord[]) =>
  resolveModuleView(find(id), lifeStoreCatalog, records, PRE);

describe("manifest- och kompatibilitetsvalidering", () => {
  it("hela katalogen validerar", () => {
    for (const m of lifeStoreCatalog) expect(validateLifeModuleManifest(m)).toEqual([]);
  });

  it("modul som kräver nyare API markeras som inkompatibel", () => {
    const future = { ...find("health"), apiVersion: "2.0.0" as const };
    const v = resolveModuleView(future, lifeStoreCatalog, [], PRE);
    expect(v.state).toBe("incompatible");
  });
});

describe("tillstånd utan persisterade rader", () => {
  it("medföljande moduler är aktiva direkt (icke-destruktiv migrering)", () => {
    for (const id of PRE) expect(view(id, []).state).toBe("enabled");
  });

  it("ej byggda moduler är tillgängliga", () => {
    expect(view("health", []).state).toBe("available");
  });
});

describe("installation", () => {
  it("installation av en tillgänglig modul tillåts", () => {
    const m = find("health");
    const check = canInstall(m, lifeStoreCatalog, [], PRE, m.permissions.map((p) => p.permission));
    expect(check.ok).toBe(true);
  });

  it("saknad obligatorisk behörighet blockerar installation", () => {
    const m = find("health");
    const check = canInstall(m, lifeStoreCatalog, [], PRE, [] as Permission[]);
    expect(check.ok).toBe(false);
    expect(check.code).toBe("missing_required_permission");
  });

  it("dubbelinstallation avvisas", () => {
    const m = find("health");
    const check = canInstall(
      m,
      lifeStoreCatalog,
      [row("health")],
      PRE,
      m.permissions.map((p) => p.permission),
    );
    expect(check.code).toBe("already_installed");
  });

  it("installerad modul visas som aktiv", () => {
    expect(view("health", [row("health")]).state).toBe("enabled");
  });
});

describe("aktivera och inaktivera", () => {
  it("inaktiverad modul får tillståndet disabled", () => {
    expect(view("health", [row("health", { enabled: false })]).state).toBe("disabled");
  });

  it("återaktivering ger enabled", () => {
    expect(view("health", [row("health", { enabled: true })]).state).toBe("enabled");
  });

  it("trasig modul rapporteras som failed", () => {
    const v = view("health", [row("health", { status: "failed", failureReason: "Krasch" })]);
    expect(v.state).toBe("failed");
    expect(v.message).toBe("Krasch");
  });
});

describe("skydd för kärnmoduler", () => {
  it("kärnmoduler kan inte avinstalleras", () => {
    for (const id of REQUIRED_MODULE_IDS) {
      const check = canUninstall(find(id));
      expect(check.ok).toBe(false);
      expect(check.code).toBe("required_module");
    }
  });

  it("kärnmoduler kan inte stängas av", () => {
    expect(canDisable(find("calendar")).code).toBe("required_module");
  });

  it("valfri modul kan avinstalleras", () => {
    expect(canUninstall(find("planning")).ok).toBe(true);
    expect(canUninstall(find("health")).ok).toBe(true);
  });
});

describe("beroenden", () => {
  const dependant = {
    ...find("health"),
    id: "dependant-demo",
    dependencies: [{ moduleId: "health", range: "^0.1.0" }],
  };
  const catalog = [...lifeStoreCatalog, dependant];

  it("obligatoriskt beroende som saknas blockerar", () => {
    expect(dependencyBlock(dependant, catalog, [], PRE)).toMatch(/Hälsa/);
  });

  it("inaktiverat beroende blockerar", () => {
    const block = dependencyBlock(dependant, catalog, [row("health", { enabled: false })], PRE);
    expect(block).toMatch(/Hälsa/);
  });

  it("aktivt beroende släpper igenom", () => {
    expect(dependencyBlock(dependant, catalog, [row("health")], PRE)).toBeNull();
  });

  it("blockerad modul får tillståndet blocked", () => {
    const v = resolveModuleView(dependant, catalog, [], PRE);
    expect(v.state).toBe("blocked");
  });

  it("valfritt beroende blockerar aldrig", () => {
    expect(dependencyBlock(find("planning"), lifeStoreCatalog, [], PRE)).toBeNull();
  });
});

describe("persistens över omladdning", () => {
  it("samma rader ger samma tillstånd vid ny uppslagning", () => {
    const records = [row("health", { enabled: false }), row("planning")];
    const first = resolveModuleViews(lifeStoreCatalog, records, PRE);
    const second = resolveModuleViews(lifeStoreCatalog, structuredClone(records), PRE);
    expect(second.map((v) => v.state)).toEqual(first.map((v) => v.state));
    expect(second.find((v) => v.manifest.id === "health")?.state).toBe("disabled");
  });

  it("gravsten döljer en medföljande modul efter avinstallation", () => {
    const v = view("planning", [row("planning", { status: "uninstalled", enabled: false })]);
    expect(v.state).toBe("available");
    expect(v.installed).toBe(false);
  });
});

describe("navigation och routeskydd", () => {
  it("bara aktiva moduler ger navigationsposter", () => {
    const views = resolveModuleViews(lifeStoreCatalog, [], PRE);
    const paths = navigableRoutes(views).map((r) => r.path);
    expect(paths).toContain("/kalender");
    expect(paths).toContain("/pengar");
    expect(paths).not.toContain("/halsa");
  });

  it("inaktiverad modul försvinner ur navigationen", () => {
    const views = resolveModuleViews(
      lifeStoreCatalog,
      [row("finance", { enabled: false })],
      PRE,
    );
    expect(navigableRoutes(views).map((r) => r.path)).not.toContain("/pengar");
  });

  it("återaktivering återställer navigationen", () => {
    const views = resolveModuleViews(lifeStoreCatalog, [row("finance", { enabled: true })], PRE);
    expect(navigableRoutes(views).map((r) => r.path)).toContain("/pengar");
  });

  it("routes för avstängd modul är inte åtkomliga", () => {
    const views = resolveModuleViews(lifeStoreCatalog, [row("planning", { enabled: false })], PRE);
    const paths = accessiblePaths(views);
    expect(paths.has("/planering")).toBe(false);
    expect(paths.has("/kalender")).toBe(true);
  });

  it("routes mappas till rätt ägarmodul och skalets vyer lämnas ifred", () => {
    expect(moduleForPath(lifeStoreCatalog, "/planering")?.id).toBe("planning");
    expect(moduleForPath(lifeStoreCatalog, "/kalender/2026-07")?.id).toBe("calendar");
    expect(moduleForPath(lifeStoreCatalog, "/tillagg")).toBeNull();
    expect(moduleForPath(lifeStoreCatalog, "/installningar")).toBeNull();
  });
});
