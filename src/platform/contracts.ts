// =====================================================================
// src/platform/contracts.ts
// Typkontrakt för framtida LifeOS-integration.
// INERT: inga nätverksanrop, inga sidoeffekter, ingen koppling till
// befintlig affärslogik. Endast typer och rena hjälpfunktioner.
// =====================================================================

/** Version på kontraktsformatet. Höjs vid brytande ändring. */
export const CONTRACT_VERSION = "1.0.0" as const;
export type ContractVersion = typeof CONTRACT_VERSION;

/** Vilket lager en aktör tillhör. */
export type Layer = "lifeos" | "lifeai" | "lifeapp";

/** Semver-liknande sträng, t.ex. "1.2.0". */
export type SemVer = string;

/**
 * Vad en modul KAN göra. Deklarativt — LifeOS använder detta för att
 * avgöra vilka kommandon som ens får skickas.
 */
export type Capability =
  | "read"
  | "write"
  | "compute"
  | "import"
  | "export"
  | "notify"
  | "schedule";

/**
 * Vad en modul FÅR göra. Verkställs av LifeOS/RLS — aldrig av LifeAI.
 * Formen är `<domän>:<åtgärd>`, t.ex. "shifts:read".
 */
export type Permission = `${string}:${string}`;

export type ModuleHealthStatus = "ok" | "degraded" | "unavailable" | "unknown";

export interface ModuleHealth {
  status: ModuleHealthStatus;
  /** Kort, användarvänlig text på svenska. */
  message?: string;
  checkedAt: string; // ISO 8601
}

export interface ModuleRoute {
  /** URL-path i skalet, t.ex. "/kalender". */
  path: string;
  /** Etikett i navigation. */
  label: string;
  /** Om routen kräver inloggad användare. */
  requiresAuth: boolean;
}

export interface ModuleEventContract {
  /** Punktnoterat namn, t.ex. "shift.created". */
  name: string;
  version: SemVer;
  description: string;
}

export interface ModuleCommandContract {
  /** Punktnoterat namn, t.ex. "shift.create". */
  name: string;
  version: SemVer;
  description: string;
  /** Vilka permissions som krävs för att kommandot ska få köras. */
  requiredPermissions: Permission[];
  /** true = användaren måste bekräfta i UI innan verkställande. */
  requiresApproval: boolean;
}

export interface ModuleDependency {
  moduleId: string;
  /** Semver-range, t.ex. "^1.0.0". */
  range: string;
  optional?: boolean;
}

/**
 * Modulmanifest — det enda LifeOS behöver känna till om en modul.
 * Rent data. Innehåller aldrig funktioner eller hemligheter.
 */
export interface ModuleManifest {
  contractVersion: ContractVersion;
  id: string;
  name: string;
  version: SemVer;
  layer: Layer;
  description: string;
  capabilities: Capability[];
  permissions: Permission[];
  routes: ModuleRoute[];
  events: ModuleEventContract[];
  commands: ModuleCommandContract[];
  dependencies: ModuleDependency[];
  health: ModuleHealth;
  /** true = modulen kan paketeras som fristående app med samma kärna. */
  standalonePackagable: boolean;
}

/** Manifest för hela appen (skalet) plus dess moduler. */
export interface AppManifest {
  contractVersion: ContractVersion;
  appId: string;
  appName: string;
  version: SemVer;
  layer: "lifeapp";
  modules: ModuleManifest[];
}

/** Ren strukturvalidering. Kastar aldrig — returnerar fel som text. */
export function validateModuleManifest(m: ModuleManifest): string[] {
  const errors: string[] = [];
  if (m.contractVersion !== CONTRACT_VERSION)
    errors.push(`Okänd kontraktsversion: ${m.contractVersion}`);
  if (!/^[a-z][a-z0-9-]*$/.test(m.id))
    errors.push(`Ogiltigt modul-ID: ${m.id}`);
  if (!/^\d+\.\d+\.\d+$/.test(m.version))
    errors.push(`Ogiltig version för ${m.id}: ${m.version}`);
  for (const p of m.permissions)
    if (!p.includes(":")) errors.push(`Ogiltig permission i ${m.id}: ${p}`);
  for (const c of m.commands)
    for (const p of c.requiredPermissions)
      if (!m.permissions.includes(p))
        errors.push(`Kommandot ${c.name} kräver permission ${p} som modulen ${m.id} inte deklarerar`);
  return errors;
}

export function validateAppManifest(app: AppManifest): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const m of app.modules) {
    if (seen.has(m.id)) errors.push(`Dubblerat modul-ID: ${m.id}`);
    seen.add(m.id);
    errors.push(...validateModuleManifest(m));
  }
  for (const m of app.modules)
    for (const d of m.dependencies)
      if (!d.optional && !seen.has(d.moduleId))
        errors.push(`Modulen ${m.id} beror på okänd modul ${d.moduleId}`);
  return errors;
}
