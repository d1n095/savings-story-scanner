// =====================================================================
// src/platform/module-registry.ts
// Modulregistret — vilka moduler som är installerade, aktiverade,
// uppdaterade eller avinstallerade. REN LOGIK: ingen databas, inget UI.
// Persistens kopplas in senare (LifeOS) bakom samma gränssnitt.
// =====================================================================

import type { Permission } from "./contracts";
import {
  isApiCompatible,
  satisfiesCaret,
  requiredPermissions,
  LIFEAPP_API_VERSION,
  type LifeModuleManifest,
} from "./module-sdk";

export type ModuleState = "available" | "installed" | "enabled" | "disabled" | "failed";

export interface InstalledModule {
  manifest: LifeModuleManifest;
  state: ModuleState;
  /** Behörigheter användaren faktiskt beviljat. Aldrig fler än manifestet begär. */
  grantedPermissions: Permission[];
  installedAt: string;
  updatedAt: string;
  /** Föregående version, används för återställning efter trasig uppdatering. */
  previousManifest?: LifeModuleManifest;
  failureReason?: string;
}

export type RegistryErrorCode =
  | "already_installed"
  | "not_installed"
  | "incompatible_api"
  | "invalid_manifest"
  | "missing_dependency"
  | "dependency_in_use"
  | "permission_not_requested"
  | "missing_required_permission"
  | "no_previous_version"
  | "downgrade_blocked";

export type RegistryResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: RegistryErrorCode; message: string };

export interface InstallOptions {
  manifest: LifeModuleManifest;
  /** Behörigheter användaren godkänt i Life Store. */
  grantedPermissions: Permission[];
  now?: Date;
}

export interface ModuleRegistry {
  list(): InstalledModule[];
  get(id: string): InstalledModule | undefined;
  install(options: InstallOptions): RegistryResult<InstalledModule>;
  enable(id: string): RegistryResult<InstalledModule>;
  disable(id: string): RegistryResult<InstalledModule>;
  uninstall(id: string): RegistryResult<string>;
  update(
    manifest: LifeModuleManifest,
    grantedPermissions?: Permission[],
    now?: Date,
  ): RegistryResult<InstalledModule>;
  /** Markera en modul som trasig efter uppdatering. */
  markFailed(id: string, reason: string): RegistryResult<InstalledModule>;
  /** Rulla tillbaka till föregående version. */
  rollback(id: string): RegistryResult<InstalledModule>;
  /** Aktiva routes som skalet får rendera. */
  activeRoutes(): { moduleId: string; path: string; label: string; nav: boolean }[];
}

const fail = (code: RegistryErrorCode, message: string): { ok: false; code: RegistryErrorCode; message: string } =>
  ({ ok: false, code, message });

export function createModuleRegistry(
  seed: InstalledModule[] = [],
  hostApiVersion = LIFEAPP_API_VERSION,
): ModuleRegistry {
  const modules = new Map<string, InstalledModule>(seed.map((m) => [m.manifest.id, m]));

  function dependenciesSatisfied(m: LifeModuleManifest): string | null {
    for (const dep of m.dependencies) {
      const installed = modules.get(dep.moduleId);
      if (!installed) {
        if (dep.optional) continue;
        return `Modulen ${m.id} kräver ${dep.moduleId} som inte är installerad.`;
      }
      if (!satisfiesCaret(installed.manifest.version, dep.range))
        return `Modulen ${m.id} kräver ${dep.moduleId}@${dep.range}, installerad är ${installed.manifest.version}.`;
    }
    return null;
  }

  return {
    list: () => [...modules.values()],
    get: (id) => modules.get(id),

    install({ manifest, grantedPermissions, now = new Date() }) {
      if (modules.has(manifest.id))
        return fail("already_installed", `${manifest.name} är redan installerad.`);
      if (!isApiCompatible(manifest, hostApiVersion))
        return fail(
          "incompatible_api",
          `${manifest.name} kräver LifeApp API ${manifest.apiVersion}, kärnan kör ${hostApiVersion}.`,
        );

      const depError = dependenciesSatisfied(manifest);
      if (depError) return fail("missing_dependency", depError);

      const requested = new Set(manifest.permissions.map((p) => p.permission));
      const extra = grantedPermissions.filter((p) => !requested.has(p));
      if (extra.length > 0)
        return fail(
          "permission_not_requested",
          `Behörighet som modulen inte begärt kan inte beviljas: ${extra.join(", ")}`,
        );

      const missing = requiredPermissions(manifest).filter((p) => !grantedPermissions.includes(p));
      if (missing.length > 0)
        return fail("missing_required_permission", `${manifest.name} kräver: ${missing.join(", ")}`);

      const entry: InstalledModule = {
        manifest,
        state: "enabled",
        grantedPermissions: [...grantedPermissions],
        installedAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      modules.set(manifest.id, entry);
      return { ok: true, value: entry };
    },

    enable(id) {
      const m = modules.get(id);
      if (!m) return fail("not_installed", `Modulen ${id} är inte installerad.`);
      const depError = dependenciesSatisfied(m.manifest);
      if (depError) return fail("missing_dependency", depError);
      m.state = "enabled";
      m.failureReason = undefined;
      return { ok: true, value: m };
    },

    disable(id) {
      const m = modules.get(id);
      if (!m) return fail("not_installed", `Modulen ${id} är inte installerad.`);
      m.state = "disabled";
      return { ok: true, value: m };
    },

    uninstall(id) {
      const m = modules.get(id);
      if (!m) return fail("not_installed", `Modulen ${id} är inte installerad.`);
      const dependant = [...modules.values()].find(
        (o) =>
          o.manifest.id !== id &&
          o.manifest.dependencies.some((d) => d.moduleId === id && !d.optional),
      );
      if (dependant)
        return fail("dependency_in_use", `${dependant.manifest.name} kräver ${m.manifest.name}.`);
      modules.delete(id);
      return { ok: true, value: id };
    },

    update(manifest, grantedPermissions, now = new Date()) {
      const current = modules.get(manifest.id);
      if (!current) return fail("not_installed", `Modulen ${manifest.id} är inte installerad.`);
      if (!isApiCompatible(manifest, hostApiVersion))
        return fail("incompatible_api", `Version ${manifest.version} kräver en nyare LifeApp.`);
      if (!satisfiesCaret(manifest.version, `^${current.manifest.version}`))
        return fail(
          "downgrade_blocked",
          `Kan inte gå från ${current.manifest.version} till ${manifest.version}.`,
        );

      const granted = grantedPermissions ?? current.grantedPermissions;
      const requested = new Set(manifest.permissions.map((p) => p.permission));
      const extra = granted.filter((p) => !requested.has(p));
      const nextGranted = granted.filter((p) => !extra.includes(p));
      const missing = requiredPermissions(manifest).filter((p) => !nextGranted.includes(p));
      if (missing.length > 0)
        return fail(
          "missing_required_permission",
          `Uppdateringen kräver nya behörigheter: ${missing.join(", ")}`,
        );

      const next: InstalledModule = {
        ...current,
        manifest,
        grantedPermissions: nextGranted,
        previousManifest: current.manifest,
        updatedAt: now.toISOString(),
        state: current.state === "failed" ? "enabled" : current.state,
        failureReason: undefined,
      };
      modules.set(manifest.id, next);
      return { ok: true, value: next };
    },

    markFailed(id, reason) {
      const m = modules.get(id);
      if (!m) return fail("not_installed", `Modulen ${id} är inte installerad.`);
      m.state = "failed";
      m.failureReason = reason;
      return { ok: true, value: m };
    },

    rollback(id) {
      const m = modules.get(id);
      if (!m) return fail("not_installed", `Modulen ${id} är inte installerad.`);
      if (!m.previousManifest)
        return fail("no_previous_version", `${m.manifest.name} har ingen tidigare version.`);
      const restored: InstalledModule = {
        ...m,
        manifest: m.previousManifest,
        previousManifest: undefined,
        state: "enabled",
        failureReason: undefined,
      };
      modules.set(id, restored);
      return { ok: true, value: restored };
    },

    activeRoutes() {
      return [...modules.values()]
        .filter((m) => m.state === "enabled")
        .flatMap((m) =>
          m.manifest.routes.map((r) => ({
            moduleId: m.manifest.id,
            path: r.path,
            label: r.label,
            nav: r.nav ?? false,
          })),
        );
    },
  };
}
