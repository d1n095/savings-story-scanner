import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { validateLifeModuleManifest, isApiCompatible } from "@/platform/module-sdk";
import { lifeStoreCatalog } from "@/modules/catalog";
import * as planning from "@/modules/planning";
import { planningModule } from "@/modules/planning/module";

const MODULE_DIR = join(process.cwd(), "src/modules/planning");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

describe("planning module manifest", () => {
  it("validerar utan fel", () => {
    expect(validateLifeModuleManifest(planningModule)).toEqual([]);
  });

  it("är kompatibel med kärnans API-version", () => {
    expect(isApiCompatible(planningModule)).toBe(true);
  });

  it("deklarerar exakt de routes skalet monterar", () => {
    expect(planningModule.routes.map((r) => r.path).sort()).toEqual(["/insikter", "/planering"]);
    expect(planningModule.routes.every((r) => r.requiresAuth)).toBe(true);
  });

  it("är samma manifest som Life Store-katalogen visar", () => {
    expect(lifeStoreCatalog.find((m) => m.id === "planning")).toBe(planningModule);
  });
});

describe("planning module isolation", () => {
  it("exponerar vyer och domänlogik via index", () => {
    expect(typeof planning.PlanningView).toBe("function");
    expect(typeof planning.InsightsView).toBe("function");
    expect(typeof planning.analyzeVacation).toBe("function");
    expect(planning.planningModule).toBe(planningModule);
  });

  it("importerar aldrig från src/routes", () => {
    const offenders = walk(MODULE_DIR).filter((file) => {
      if (!/\.(ts|tsx)$/.test(file)) return false;
      return /from\s+["'](@\/routes|.*\.\.\/routes)/.test(readFileSync(file, "utf8"));
    });
    expect(offenders).toEqual([]);
  });

  it("importerar inga interna filer från andra moduler", () => {
    const offenders: string[] = [];
    for (const file of walk(MODULE_DIR)) {
      if (!/\.(ts|tsx)$/.test(file) || file.includes("__tests__")) continue;

      const src = readFileSync(file, "utf8");
      for (const match of src.matchAll(/from\s+["']@\/modules\/([a-z-]+)\/?([^"']*)["']/g)) {
        const [, moduleId, rest] = match;
        if (moduleId === "planning") continue;
        // Endast salary och calendar är delad domänkärna i detta steg.
        if (["salary", "calendar"].includes(moduleId)) continue;
        offenders.push(`${file}: @/modules/${moduleId}/${rest}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("planning route adapters", () => {
  const routeFiles = ["src/routes/_app/planering.tsx", "src/routes/_app/insikter.tsx"];

  it("är tunna och innehåller ingen affärslogik", () => {
    for (const rel of routeFiles) {
      const src = readFileSync(join(process.cwd(), rel), "utf8");
      expect(src).toContain("@/modules/planning");
      expect(src).not.toContain("supabase");
      expect(src).not.toContain("useQuery");
      expect(src.split("\n").length).toBeLessThan(20);
    }
  });

  it("ligger under den autentiserade _app-layouten", () => {
    for (const rel of routeFiles) {
      const src = readFileSync(join(process.cwd(), rel), "utf8");
      expect(src).toMatch(/createFileRoute\("\/_app\//);
    }
  });
});
