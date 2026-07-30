// =====================================================================
// src/services/module-service.ts
// Enda vägen till persisterat modultillstånd. Både Life Store och
// applikationsskalet använder den här — inga direkta Supabase-anrop
// i UI-komponenter.
// =====================================================================

import { supabase } from "@/integrations/supabase/client";
import type { Permission } from "@/platform";
import {
  lifeStoreCatalog,
  preinstalledModules,
  requestedPermissions,
  type LifeModuleManifest,
} from "@/platform";
import {
  canDisable,
  canInstall,
  canUninstall,
  resolveModuleViews,
  type LifecycleErrorCode,
  type ModuleInstallationRecord,
  type ModuleView,
} from "@/platform/module-state";

export type ServiceResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: LifecycleErrorCode; message: string };

const fail = <T>(code: LifecycleErrorCode, message: string): ServiceResult<T> => ({
  ok: false,
  code,
  message,
});

export const PREINSTALLED_IDS: readonly string[] = preinstalledModules.map((m) => m.id);

export function listCatalog(): LifeModuleManifest[] {
  return lifeStoreCatalog;
}

export function findManifest(moduleId: string): LifeModuleManifest | undefined {
  return lifeStoreCatalog.find((m) => m.id === moduleId);
}

type Row = {
  module_id: string;
  version: string;
  status: string;
  enabled: boolean;
  granted_permissions: string[];
  settings: unknown;
  failure_reason: string | null;
  installed_at: string;
  updated_at: string;
};

function toRecord(row: Row): ModuleInstallationRecord {
  return {
    moduleId: row.module_id,
    version: row.version,
    status:
      row.status === "failed"
        ? "failed"
        : row.status === "uninstalled"
          ? "uninstalled"
          : "installed",
    enabled: row.enabled,
    grantedPermissions: (row.granted_permissions ?? []) as Permission[],
    settings: (row.settings as Record<string, unknown>) ?? {},
    failureReason: row.failure_reason,
    installedAt: row.installed_at,
    updatedAt: row.updated_at,
  };
}

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

async function audit(
  userId: string,
  moduleId: string,
  action: string,
  success: boolean,
  detail?: string,
): Promise<void> {
  // Audit får aldrig fälla själva åtgärden.
  await supabase
    .from("module_audit_events")
    .insert({ user_id: userId, module_id: moduleId, action, success, detail: detail ?? null });
}

export async function listInstallations(): Promise<ServiceResult<ModuleInstallationRecord[]>> {
  const userId = await currentUserId();
  if (!userId) return fail("unauthorized", "Du måste vara inloggad för att hantera moduler.");
  const { data, error } = await supabase
    .from("module_installations")
    .select(
      "module_id, version, status, enabled, granted_permissions, settings, failure_reason, installed_at, updated_at",
    );
  if (error)
    return fail("persistence_failed", `Kunde inte läsa modultillståndet: ${error.message}`);
  return { ok: true, value: (data as Row[]).map(toRecord) };
}

export async function listModuleViews(): Promise<ServiceResult<ModuleView[]>> {
  const records = await listInstallations();
  if (!records.ok) return records;
  return {
    ok: true,
    value: resolveModuleViews(lifeStoreCatalog, records.value, PREINSTALLED_IDS),
  };
}

export interface AuditRow {
  id: string;
  moduleId: string;
  action: string;
  success: boolean;
  detail: string | null;
  createdAt: string;
}

export async function listAudit(limit = 20): Promise<ServiceResult<AuditRow[]>> {
  const userId = await currentUserId();
  if (!userId) return fail("unauthorized", "Du måste vara inloggad.");
  const { data, error } = await supabase
    .from("module_audit_events")
    .select("id, module_id, action, success, detail, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return fail("persistence_failed", `Kunde inte läsa modulloggen: ${error.message}`);
  return {
    ok: true,
    value: data.map((r) => ({
      id: r.id,
      moduleId: r.module_id,
      action: r.action,
      success: r.success,
      detail: r.detail,
      createdAt: r.created_at,
    })),
  };
}

export async function installModule(
  moduleId: string,
  grantedPermissions?: Permission[],
): Promise<ServiceResult<ModuleInstallationRecord>> {
  const userId = await currentUserId();
  if (!userId) return fail("unauthorized", "Du måste vara inloggad för att installera moduler.");
  const manifest = findManifest(moduleId);
  if (!manifest) return fail("not_installed", `Modulen ${moduleId} finns inte i katalogen.`);

  const existing = await listInstallations();
  if (!existing.ok) return existing;

  const granted = grantedPermissions ?? requestedPermissions(manifest);
  const check = canInstall(manifest, lifeStoreCatalog, existing.value, PREINSTALLED_IDS, granted);
  if (!check.ok) {
    await audit(userId, moduleId, "install", false, check.message);
    return fail(check.code ?? "persistence_failed", check.message ?? "Installationen nekades.");
  }

  const { data, error } = await supabase
    .from("module_installations")
    .insert({
      user_id: userId,
      module_id: moduleId,
      version: manifest.version,
      status: "installed",
      enabled: true,
      granted_permissions: granted,
    })
    .select(
      "module_id, version, status, enabled, granted_permissions, settings, failure_reason, installed_at, updated_at",
    )
    .single();

  if (error || !data) {
    await audit(userId, moduleId, "install", false, error?.message);
    return fail(
      "persistence_failed",
      `Installationen kunde inte sparas: ${error?.message ?? "okänt fel"}`,
    );
  }
  await audit(userId, moduleId, "install", true, `v${manifest.version}`);
  return { ok: true, value: toRecord(data as Row) };
}

async function setEnabled(
  moduleId: string,
  enabled: boolean,
): Promise<ServiceResult<ModuleInstallationRecord>> {
  const userId = await currentUserId();
  if (!userId) return fail("unauthorized", "Du måste vara inloggad.");
  const manifest = findManifest(moduleId);
  if (!manifest) return fail("not_installed", `Modulen ${moduleId} finns inte i katalogen.`);

  const action = enabled ? "enable" : "disable";

  if (!enabled) {
    const check = canDisable(manifest);
    if (!check.ok) {
      await audit(userId, moduleId, action, false, check.message);
      return fail(check.code ?? "persistence_failed", check.message ?? "Åtgärden nekades.");
    }
  }

  const existing = await listInstallations();
  if (!existing.ok) return existing;
  const hasRow = existing.value.some((r) => r.moduleId === moduleId && r.status !== "uninstalled");

  const tombstoned = existing.value.some(
    (r) => r.moduleId === moduleId && r.status === "uninstalled",
  );
  if (!hasRow && (tombstoned || !PREINSTALLED_IDS.includes(moduleId)))
    return fail("not_installed", `${manifest.name} är inte installerad.`);

  if (enabled) {
    const blocked = canInstall(
      manifest,
      lifeStoreCatalog,
      existing.value.filter((r) => r.moduleId !== moduleId),
      PREINSTALLED_IDS,
      requestedPermissions(manifest),
    );
    if (!blocked.ok && blocked.code === "missing_dependency") {
      await audit(userId, moduleId, action, false, blocked.message);
      return fail("missing_dependency", blocked.message ?? "Beroende saknas.");
    }
  }

  // Medföljande moduler kan sakna rad — skapa den vid första ändringen.
  const { data, error } = await supabase
    .from("module_installations")
    .upsert(
      {
        user_id: userId,
        module_id: moduleId,
        version: manifest.version,
        status: "installed",
        enabled,
        granted_permissions: requestedPermissions(manifest),
      },
      { onConflict: "user_id,module_id" },
    )
    .select(
      "module_id, version, status, enabled, granted_permissions, settings, failure_reason, installed_at, updated_at",
    )
    .single();

  if (error || !data) {
    await audit(userId, moduleId, action, false, error?.message);
    return fail(
      "persistence_failed",
      `Ändringen kunde inte sparas: ${error?.message ?? "okänt fel"}`,
    );
  }
  await audit(userId, moduleId, action, true);
  return { ok: true, value: toRecord(data as Row) };
}

export const enableModule = (moduleId: string) => setEnabled(moduleId, true);
export const disableModule = (moduleId: string) => setEnabled(moduleId, false);

export async function uninstallModule(moduleId: string): Promise<ServiceResult<string>> {
  const userId = await currentUserId();
  if (!userId) return fail("unauthorized", "Du måste vara inloggad.");
  const manifest = findManifest(moduleId);
  if (!manifest) return fail("not_installed", `Modulen ${moduleId} finns inte i katalogen.`);

  const check = canUninstall(manifest);
  if (!check.ok) {
    await audit(userId, moduleId, "uninstall", false, check.message);
    return fail(check.code ?? "persistence_failed", check.message ?? "Åtgärden nekades.");
  }

  const existing = await listInstallations();
  if (!existing.ok) return existing;

  // Moduler som beror på denna får inte lämnas trasiga.
  const dependant = lifeStoreCatalog.find((m) => {
    if (m.id === moduleId) return false;
    if (!m.dependencies.some((d) => d.moduleId === moduleId && !d.optional)) return false;
    const row = existing.value.find((r) => r.moduleId === m.id);
    if (row) return row.status === "installed" && row.enabled;
    return PREINSTALLED_IDS.includes(m.id);
  });
  if (dependant) {
    const message = `${dependant.name} kräver ${manifest.name}. Avinstallera den först.`;
    await audit(userId, moduleId, "uninstall", false, message);
    return fail("missing_dependency", message);
  }

  const error = PREINSTALLED_IDS.includes(moduleId)
    ? (
        await supabase.from("module_installations").upsert(
          {
            user_id: userId,
            module_id: moduleId,
            version: manifest.version,
            status: "uninstalled",
            enabled: false,
            granted_permissions: [],
          },
          { onConflict: "user_id,module_id" },
        )
      ).error
    : (await supabase.from("module_installations").delete().eq("module_id", moduleId)).error;

  if (error) {
    await audit(userId, moduleId, "uninstall", false, error.message);
    return fail("persistence_failed", `Avinstallationen kunde inte sparas: ${error.message}`);
  }
  await audit(userId, moduleId, "uninstall", true, "Modulens data behålls.");
  return { ok: true, value: moduleId };
}
