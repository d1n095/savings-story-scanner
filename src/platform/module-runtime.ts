// =====================================================================
// src/platform/module-runtime.ts
// Life Module Runtime — lagret som KÖR moduler och säkrar dem.
// Varje åtkomst prövas mot beviljade behörigheter och manifestet.
// REN LOGIK: fattar beslut, utför ingenting, gör ingen I/O.
// LifeAI får föreslå; runtime + LifeOS avgör.
// =====================================================================

import type { Permission } from "./contracts";
import type { CommandEnvelope } from "./commands";
import type { EventEnvelope } from "./events";
import type { InstalledModule, ModuleRegistry } from "./module-registry";

export type DenyReason =
  | "module_unknown"
  | "module_disabled"
  | "module_failed"
  | "route_not_declared"
  | "permission_not_granted"
  | "event_not_declared"
  | "command_not_supported"
  | "foreign_data_scope"
  | "secret_access_denied";

export type Decision =
  | { allowed: true }
  | { allowed: false; reason: DenyReason; message: string };

const allow: Decision = { allowed: true };
const deny = (reason: DenyReason, message: string): Decision => ({ allowed: false, reason, message });

export interface AuditEntry {
  at: string;
  moduleId: string;
  action: string;
  target: string;
  allowed: boolean;
  reason?: DenyReason;
}

export interface ModuleRuntimeOptions {
  registry: ModuleRegistry;
  now?: () => Date;
  /** Max antal auditrader som hålls i minnet. */
  maxAudit?: number;
}

export interface ModuleRuntime {
  canRegisterRoute(moduleId: string, path: string): Decision;
  canAccess(moduleId: string, permission: Permission): Decision;
  /** Modulen får bara läsa/skriva data inom sin egen datascope-prefix. */
  canAccessDataScope(moduleId: string, scope: string): Decision;
  canConsumeEvent(moduleId: string, event: EventEnvelope): Decision;
  canPublishEvent(moduleId: string, eventName: string): Decision;
  canReceiveCommand(moduleId: string, command: CommandEnvelope): Decision;
  /** Moduler får aldrig nå AI-nycklar eller centrala hemligheter. */
  canReadSecret(moduleId: string, secretName: string): Decision;
  audit(): readonly AuditEntry[];
}

function ready(m: InstalledModule | undefined, id: string): Decision {
  if (!m) return deny("module_unknown", `Modulen ${id} är inte installerad.`);
  if (m.state === "failed")
    return deny("module_failed", `${m.manifest.name} är markerad som trasig och körs inte.`);
  if (m.state !== "enabled")
    return deny("module_disabled", `${m.manifest.name} är inaktiverad.`);
  return allow;
}

export function createModuleRuntime(options: ModuleRuntimeOptions): ModuleRuntime {
  const { registry } = options;
  const now = options.now ?? (() => new Date());
  const maxAudit = options.maxAudit ?? 500;
  const log: AuditEntry[] = [];

  function record(moduleId: string, action: string, target: string, d: Decision): Decision {
    log.push({
      at: now().toISOString(),
      moduleId,
      action,
      target,
      allowed: d.allowed,
      reason: d.allowed ? undefined : d.reason,
    });
    while (log.length > maxAudit) log.shift();
    return d;
  }

  function check(moduleId: string, action: string, target: string, fn: (m: InstalledModule) => Decision): Decision {
    const mod = registry.get(moduleId);
    const gate = ready(mod, moduleId);
    if (!gate.allowed) return record(moduleId, action, target, gate);
    return record(moduleId, action, target, fn(mod!));
  }

  return {
    canRegisterRoute(moduleId, path) {
      return check(moduleId, "route", path, (m) =>
        m.manifest.routes.some((r) => r.path === path)
          ? allow
          : deny("route_not_declared", `Routen ${path} finns inte i manifestet för ${m.manifest.id}.`),
      );
    },

    canAccess(moduleId, permission) {
      return check(moduleId, "permission", permission, (m) =>
        m.grantedPermissions.includes(permission)
          ? allow
          : deny("permission_not_granted", `${m.manifest.name} saknar behörigheten ${permission}.`),
      );
    },

    canAccessDataScope(moduleId, scope) {
      return check(moduleId, "data", scope, (m) => {
        const domain = scope.split(":")[0];
        const owns = m.grantedPermissions.some((p) => p.split(":")[0] === domain);
        return owns
          ? allow
          : deny("foreign_data_scope", `${m.manifest.name} får inte röra data i ${domain}.`);
      });
    },

    canConsumeEvent(moduleId, event) {
      return check(moduleId, "event.consume", event.name, (m) =>
        m.manifest.eventsConsumed.includes(event.name)
          ? allow
          : deny("event_not_declared", `${m.manifest.name} prenumererar inte på ${event.name}.`),
      );
    },

    canPublishEvent(moduleId, eventName) {
      return check(moduleId, "event.publish", eventName, (m) =>
        m.manifest.eventsPublished.includes(eventName)
          ? allow
          : deny("event_not_declared", `${m.manifest.name} deklarerar inte händelsen ${eventName}.`),
      );
    },

    canReceiveCommand(moduleId, command) {
      return check(moduleId, "command", command.name, (m) =>
        m.manifest.commandsSupported.includes(command.name)
          ? allow
          : deny("command_not_supported", `${m.manifest.name} stöder inte kommandot ${command.name}.`),
      );
    },

    canReadSecret(moduleId, secretName) {
      return check(moduleId, "secret", secretName, (m) =>
        deny(
          "secret_access_denied",
          `Moduler får aldrig läsa hemligheter. ${m.manifest.name} nekades ${secretName}.`,
        ),
      );
    },

    audit: () => log,
  };
}
