// =====================================================================
// src/platform/commands.ts
// Inkommande kommandon: LifeAI FÖRESLÅR, LifeOS VALIDERAR, LifeApp UTFÖR.
// INERT: inga nätverksanrop. Endast typer + ren policykontroll.
// =====================================================================

import type { ContractVersion, Permission, SemVer } from "./contracts";
import { CONTRACT_VERSION } from "./contracts";

/** Kuvert för ett kommando på väg in i LifeApp. */
export interface CommandEnvelope<TPayload = unknown> {
  contractVersion: ContractVersion;
  /** Unikt id, används för idempotens och audit. */
  commandId: string;
  /** Punktnoterat kommandonamn, t.ex. "shift.create". */
  name: string;
  version: SemVer;
  /** Vem som initierade. LifeAI får aldrig vara "lifeapp". */
  origin: "lifeos" | "lifeai";
  /** Kedjan av aktörer, för spårbarhet. */
  actorChain: string[];
  /** Ägarskapskontext kommandot gäller (ADR-002). */
  ownerContextId: string;
  issuedAt: string; // ISO 8601
  /** Engångsvärde mot replay. */
  nonce: string;
  payload: TPayload;
}

export type CommandRejectionCode =
  | "unknown_command"
  | "unsupported_contract_version"
  | "missing_permission"
  | "approval_required"
  | "expired"
  | "replayed"
  | "invalid_payload"
  | "not_implemented";

export type CommandResult<TData = unknown> =
  | { ok: true; commandId: string; data: TData }
  | { ok: false; commandId: string; code: CommandRejectionCode; message: string };

/** Vad LifeApp behöver veta lokalt för att avgöra om ett kommando får köras. */
export interface CommandPolicy {
  name: string;
  requiredPermissions: Permission[];
  requiresApproval: boolean;
  /** Maximal ålder på kommandot i sekunder. */
  maxAgeSeconds: number;
}

export interface CommandContext {
  /** Permissions LifeOS har intygat för denna kontext. */
  grantedPermissions: Permission[];
  /** Sant om användaren redan godkänt kommandot i UI. */
  approved: boolean;
  /** Nonces som redan setts. Injiceras av anroparen. */
  seenNonces: ReadonlySet<string>;
  now: Date;
}

/**
 * Ren policykontroll. Utför INGENTING — avgör bara om ett kommando
 * skulle få verkställas. Verkställighet sker alltid i LifeApp/LifeOS.
 */
export function evaluateCommand(
  envelope: CommandEnvelope,
  policy: CommandPolicy | undefined,
  ctx: CommandContext,
): CommandResult<never> | { ok: true; commandId: string; data: never } | { ok: false; commandId: string; code: CommandRejectionCode; message: string } {
  const id = envelope.commandId;
  if (envelope.contractVersion !== CONTRACT_VERSION)
    return { ok: false, commandId: id, code: "unsupported_contract_version", message: "Kommandots kontraktsversion stöds inte." };
  if (!policy)
    return { ok: false, commandId: id, code: "unknown_command", message: `Okänt kommando: ${envelope.name}` };
  if (ctx.seenNonces.has(envelope.nonce))
    return { ok: false, commandId: id, code: "replayed", message: "Kommandot har redan tagits emot." };

  const ageMs = ctx.now.getTime() - new Date(envelope.issuedAt).getTime();
  if (!Number.isFinite(ageMs) || ageMs > policy.maxAgeSeconds * 1000 || ageMs < -60_000)
    return { ok: false, commandId: id, code: "expired", message: "Kommandot är för gammalt eller har ogiltig tidsstämpel." };

  const missing = policy.requiredPermissions.filter((p) => !ctx.grantedPermissions.includes(p));
  if (missing.length > 0)
    return { ok: false, commandId: id, code: "missing_permission", message: `Saknar behörighet: ${missing.join(", ")}` };

  if (policy.requiresApproval && !ctx.approved)
    return { ok: false, commandId: id, code: "approval_required", message: "Kommandot kräver användarens godkännande." };

  return { ok: true, commandId: id, data: undefined as never };
}
