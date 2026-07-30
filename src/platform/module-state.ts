// =====================================================================
// src/platform/module-state.ts
// Ren logik som översätter persisterade installationsrader + katalogen
// till det tillstånd skalet och Life Store visar. INGEN I/O.
// =====================================================================

import type { Permission } from "./contracts";
import {
  isApiCompatible,
  satisfiesCaret,
  requiredPermissions,
  LIFEAPP_API_VERSION,
  type LifeModuleManifest,
} from "./module-sdk";
import type { SemVer } from "./contracts";

/** Kärnmoduler som alltid är installerade och inte får avinstalleras. */
export const REQUIRED_MODULE_IDS: readonly string[] = ["calendar", "work", "finance"];

export function isRequiredModule(moduleId: string): boolean {
  return REQUIRED_MODULE_IDS.includes(moduleId);
}

/** En rad i public.module_installations, i applikationsform. */
export interface ModuleInstallationRecord {
  moduleId: string;
  version: SemVer;
  status: "installed" | "failed" | "uninstalled";
  enabled: boolean;
  grantedPermissions: Permission[];
  settings: Record<string, unknown>;
  failureReason: string | null;
  installedAt: string;
  updatedAt: string;
}

export type ModuleUiState =
  | "enabled"
  | "disabled"
  | "available"
  | "incompatible"
  | "blocked"
  | "failed";

export interface ModuleView {
  manifest: LifeModuleManifest;
  state: ModuleUiState;
  /** Finns en persisterad rad, eller är den implicit medföljande? */
  installed: boolean;
  required: boolean;
  record: ModuleInstallationRecord | null;
  /** Kort svensk förklaring när modulen inte kan köras. */
  message?: string;
}

/**
 * Moduler som följde med LifeApp innan Life Store fanns räknas som
 * installerade och aktiva tills användaren själv ändrar det. Detta gör
 * migreringen icke-destruktiv: befintlig funktionalitet försvinner inte.
 */
export function implicitRecord(
  manifest: LifeModuleManifest,
  preinstalledIds: readonly string[],
): ModuleInstallationRecord | null {
  if (!preinstalledIds.includes(manifest.id)) return null;
  return {
    moduleId: manifest.id,
    version: manifest.version,
    status: "installed",
    enabled: true,
    grantedPermissions: manifest.permissions.map((p) => p.permission),
    settings: {},
    failureReason: null,
    installedAt: "",
    updatedAt: "",
  };
}

function recordFor(
  manifest: LifeModuleManifest,
  records: ModuleInstallationRecord[],
  preinstalledIds: readonly string[],
): { record: ModuleInstallationRecord | null; persisted: boolean } {
  const persisted = records.find((r) => r.moduleId === manifest.id) ?? null;
  // En "uninstalled"-rad är en gravsten: den stänger av den implicita
  // medföljande installationen utan att röra användarens data.
  if (persisted?.status === "uninstalled") return { record: null, persisted: true };
  if (persisted) return { record: persisted, persisted: true };
  return { record: implicitRecord(manifest, preinstalledIds), persisted: false };
}

function isEffectivelyEnabled(
  manifest: LifeModuleManifest,
  records: ModuleInstallationRecord[],
  preinstalledIds: readonly string[],
): boolean {
  const { record } = recordFor(manifest, records, preinstalledIds);
  return !!record && record.status === "installed" && record.enabled;
}

/** Ett obligatoriskt beroende måste vara installerat, aktivt och i rätt version. */
export function dependencyBlock(
  manifest: LifeModuleManifest,
  catalog: LifeModuleManifest[],
  records: ModuleInstallationRecord[],
  preinstalledIds: readonly string[],
): string | null {
  for (const dep of manifest.dependencies) {
    if (dep.optional) continue;
    const depManifest = catalog.find((m) => m.id === dep.moduleId);
    if (!depManifest) return `Kräver ${dep.moduleId} som inte finns i katalogen.`;
    if (!isEffectivelyEnabled(depManifest, records, preinstalledIds))
      return `Kräver att ${depManifest.name} är installerad och aktiv.`;
    const installedVersion =
      records.find((r) => r.moduleId === dep.moduleId)?.version ?? depManifest.version;
    if (!satisfiesCaret(installedVersion, dep.range))
      return `Kräver ${depManifest.name}@${dep.range}, installerad är ${installedVersion}.`;
  }
  return null;
}

export function resolveModuleView(
  manifest: LifeModuleManifest,
  catalog: LifeModuleManifest[],
  records: ModuleInstallationRecord[],
  preinstalledIds: readonly string[],
  hostApiVersion: SemVer = LIFEAPP_API_VERSION,
): ModuleView {
  const { record } = recordFor(manifest, records, preinstalledIds);
  const required = isRequiredModule(manifest.id);
  const base = { manifest, record, installed: !!record, required };

  if (!isApiCompatible(manifest, hostApiVersion))
    return {
      ...base,
      state: "incompatible",
      message: `Kräver LifeApp API ${manifest.apiVersion}, kärnan kör ${hostApiVersion}.`,
    };

  if (record && record.status === "failed")
    return {
      ...base,
      state: "failed",
      message: record.failureReason ?? "Modulen är markerad som trasig.",
    };

  const blocked = dependencyBlock(manifest, catalog, records, preinstalledIds);
  if (blocked && (!record || record.enabled))
    return { ...base, state: "blocked", message: blocked };

  if (!record) return { ...base, state: "available" };
  if (!record.enabled)
    return { ...base, state: "disabled", message: "Modulen är inaktiverad." };

  return { ...base, state: "enabled" };
}

export function resolveModuleViews(
  catalog: LifeModuleManifest[],
  records: ModuleInstallationRecord[],
  preinstalledIds: readonly string[],
  hostApiVersion: SemVer = LIFEAPP_API_VERSION,
): ModuleView[] {
  return catalog.map((m) =>
    resolveModuleView(m, catalog, records, preinstalledIds, hostApiVersion),
  );
}

/** Routes som skalet får visa i navigationen just nu. */
export function navigableRoutes(views: ModuleView[]): {
  moduleId: string;
  path: string;
  label: string;
}[] {
  return views
    .filter((v) => v.state === "enabled")
    .flatMap((v) =>
      v.manifest.routes
        .filter((r) => r.nav)
        .map((r) => ({ moduleId: v.manifest.id, path: r.path, label: r.label })),
    );
}

/** Alla routes en aktiv modul äger — används av routeskyddet. */
export function accessiblePaths(views: ModuleView[]): Set<string> {
  const paths = new Set<string>();
  for (const v of views)
    if (v.state === "enabled") for (const r of v.manifest.routes) paths.add(r.path);
  return paths;
}

/** Vilken modul äger en route? Okänd route ägs av skalet (core). */
export function moduleForPath(
  catalog: LifeModuleManifest[],
  pathname: string,
): LifeModuleManifest | null {
  let match: LifeModuleManifest | null = null;
  let matchLength = -1;
  for (const m of catalog)
    for (const r of m.routes)
      if ((pathname === r.path || pathname.startsWith(`${r.path}/`)) && r.path.length > matchLength) {
        match = m;
        matchLength = r.path.length;
      }
  return match;
}

export type LifecycleErrorCode =
  | "unauthorized"
  | "incompatible_api"
  | "missing_dependency"
  | "missing_required_permission"
  | "required_module"
  | "not_installed"
  | "already_installed"
  | "persistence_failed";

export interface LifecycleCheck {
  ok: boolean;
  code?: LifecycleErrorCode;
  message?: string;
}

const ok: LifecycleCheck = { ok: true };
const nope = (code: LifecycleErrorCode, message: string): LifecycleCheck => ({
  ok: false,
  code,
  message,
});

export function canInstall(
  manifest: LifeModuleManifest,
  catalog: LifeModuleManifest[],
  records: ModuleInstallationRecord[],
  preinstalledIds: readonly string[],
  grantedPermissions: Permission[],
  hostApiVersion: SemVer = LIFEAPP_API_VERSION,
): LifecycleCheck {
  if (records.some((r) => r.moduleId === manifest.id && r.status !== "uninstalled"))
    return nope("already_installed", `${manifest.name} är redan installerad.`);
  if (!isApiCompatible(manifest, hostApiVersion))
    return nope("incompatible_api", `${manifest.name} kräver en nyare LifeApp.`);
  const blocked = dependencyBlock(manifest, catalog, records, preinstalledIds);
  if (blocked) return nope("missing_dependency", blocked);
  const missing = requiredPermissions(manifest).filter((p) => !grantedPermissions.includes(p));
  if (missing.length > 0)
    return nope("missing_required_permission", `${manifest.name} kräver: ${missing.join(", ")}`);
  return ok;
}

export function canUninstall(manifest: LifeModuleManifest): LifecycleCheck {
  if (isRequiredModule(manifest.id))
    return nope(
      "required_module",
      `${manifest.name} är en kärnmodul i LifeApp och kan inte avinstalleras.`,
    );
  return ok;
}

export function canDisable(manifest: LifeModuleManifest): LifecycleCheck {
  if (isRequiredModule(manifest.id))
    return nope(
      "required_module",
      `${manifest.name} är en kärnmodul och kan inte stängas av.`,
    );
  return ok;
}
