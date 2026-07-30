// =====================================================================
// src/platform/module-sdk.ts
// Life Module SDK — det gemensamma sättet att bygga en LifeApp-modul.
// INERT: endast typer, rena funktioner och validering. Ingen I/O.
// =====================================================================

import type { Capability, Permission, SemVer } from "./contracts";

/** API-version som denna LifeApp-kärna kan köra moduler mot. */
export const LIFEAPP_API_VERSION = "1.0.0" as const;

export type ModulePricing =
  | { kind: "free" }
  | { kind: "first-party" }
  | { kind: "paid"; priceSek: number; billing: "once" | "monthly" | "yearly" };

/** En route en modul begär att få registrera i skalet. */
export interface LifeModuleRoute {
  path: string;
  label: string;
  requiresAuth: boolean;
  /** Visas i huvudnavigationen när modulen är aktiverad. */
  nav?: boolean;
}

/**
 * En behörighet modulen begär. Användaren ser `reason` innan installation.
 * Modulen får ALDRIG mer än vad som står här — runtime nekar resten.
 */
export interface ModulePermissionRequest {
  permission: Permission;
  reason: string;
  /** false = modulen fungerar utan den; användaren kan neka. */
  required: boolean;
}

export interface ModuleDependencyRequest {
  moduleId: string;
  /** Caret-range, t.ex. "^1.0.0". */
  range: string;
  optional?: boolean;
}

/** Manifestet varje Life Module levererar. Ren data, inga hemligheter. */
export interface LifeModuleManifest {
  id: string;
  name: string;
  version: SemVer;
  /** Vilken LifeApp-API-version modulen är byggd mot. */
  apiVersion: SemVer;
  description: string;
  publisher: string;
  /** Förstapartsmoduler följer med LifeApp men körs via samma runtime. */
  firstParty: boolean;
  pricing: ModulePricing;

  routes: LifeModuleRoute[];
  capabilities: Capability[];
  permissions: ModulePermissionRequest[];
  dependencies: ModuleDependencyRequest[];

  eventsPublished: string[];
  eventsConsumed: string[];
  commandsSupported: string[];

  /** Ungefärlig lagringsanvändning som visas i Life Store. */
  estimatedStorageKb?: number;

  standalone?: {
    enabled: boolean;
    entryPoint?: string;
  };
}

const SEMVER = /^\d+\.\d+\.\d+$/;
const DOTTED = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/;

/** Ren strukturvalidering. Kastar aldrig. */
export function validateLifeModuleManifest(m: LifeModuleManifest): string[] {
  const errors: string[] = [];
  if (!/^[a-z][a-z0-9-]*$/.test(m.id)) errors.push(`Ogiltigt modul-ID: ${m.id}`);
  if (!SEMVER.test(m.version)) errors.push(`Ogiltig version för ${m.id}: ${m.version}`);
  if (!SEMVER.test(m.apiVersion)) errors.push(`Ogiltig apiVersion för ${m.id}: ${m.apiVersion}`);
  if (!m.name.trim()) errors.push(`Modulen ${m.id} saknar namn.`);
  if (!m.publisher.trim()) errors.push(`Modulen ${m.id} saknar utgivare.`);

  const paths = new Set<string>();
  for (const r of m.routes) {
    if (!r.path.startsWith("/")) errors.push(`Ogiltig route i ${m.id}: ${r.path}`);
    if (paths.has(r.path)) errors.push(`Dubblerad route i ${m.id}: ${r.path}`);
    paths.add(r.path);
  }

  for (const p of m.permissions) {
    if (!p.permission.includes(":")) errors.push(`Ogiltig permission i ${m.id}: ${p.permission}`);
    if (!p.reason.trim()) errors.push(`Permission ${p.permission} i ${m.id} saknar motivering.`);
  }

  for (const e of [...m.eventsPublished, ...m.eventsConsumed])
    if (!DOTTED.test(e)) errors.push(`Ogiltigt händelsenamn i ${m.id}: ${e}`);
  for (const c of m.commandsSupported)
    if (!DOTTED.test(c)) errors.push(`Ogiltigt kommandonamn i ${m.id}: ${c}`);

  if (m.standalone?.enabled && !m.standalone.entryPoint)
    errors.push(`Modulen ${m.id} är markerad som fristående men saknar entryPoint.`);

  return errors;
}

/**
 * Definiera en modul. Validerar direkt så att fel upptäcks vid bygget
 * och inte hos användaren.
 */
export function defineLifeModule(manifest: LifeModuleManifest): LifeModuleManifest {
  const errors = validateLifeModuleManifest(manifest);
  if (errors.length > 0)
    throw new Error(`Ogiltigt modulmanifest (${manifest.id}): ${errors.join("; ")}`);
  return Object.freeze(manifest);
}

function parse(v: SemVer): [number, number, number] {
  const [a, b, c] = v.split(".").map((n) => Number.parseInt(n, 10));
  return [a, b, c];
}

/** Caret-jämförelse: "^1.2.0" matchar 1.x.y där x.y >= 2.0. */
export function satisfiesCaret(version: SemVer, range: string): boolean {
  if (!range.startsWith("^")) return version === range;
  const [rMa, rMi, rPa] = parse(range.slice(1));
  const [ma, mi, pa] = parse(version);
  if ([rMa, rMi, rPa, ma, mi, pa].some(Number.isNaN)) return false;
  if (ma !== rMa) return false;
  if (mi !== rMi) return mi > rMi;
  return pa >= rPa;
}

/** Kan denna LifeApp-kärna köra modulen? */
export function isApiCompatible(
  manifest: LifeModuleManifest,
  hostApiVersion: SemVer = LIFEAPP_API_VERSION,
): boolean {
  const [mMa] = parse(manifest.apiVersion);
  const [hMa, hMi, hPa] = parse(hostApiVersion);
  if (mMa !== hMa) return false;
  const [, mMi, mPa] = parse(manifest.apiVersion);
  // Modulen får inte kräva nyare minor/patch än kärnan.
  if (mMi > hMi) return false;
  if (mMi === hMi && mPa > hPa) return false;
  return true;
}

/** Alla permissions modulen begär, oavsett om de är obligatoriska. */
export function requestedPermissions(m: LifeModuleManifest): Permission[] {
  return m.permissions.map((p) => p.permission);
}

export function requiredPermissions(m: LifeModuleManifest): Permission[] {
  return m.permissions.filter((p) => p.required).map((p) => p.permission);
}
