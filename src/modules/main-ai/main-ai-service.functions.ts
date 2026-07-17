// Authenticated MainAI server functions.
// - Owner-verified reads/writes (RLS + explicit checks).
// - Real provider call when GEMINI_API_KEY is set.
// - Never logs the API key or full prompt content in audit events.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Conversation, Message, Task, AuditEvent, MessageRole } from "./types";

// History policy: send at most HISTORY_LIMIT most-recent messages to the
// provider, each truncated to MAX_CONTENT_CHARS. This bounds cost without
// silently cutting the visible conversation.
const HISTORY_LIMIT = 30;
const MAX_CONTENT_CHARS = 8_000;
const MAX_USER_MESSAGE_CHARS = 8_000;

async function logAudit(
  supabase: any,
  userId: string,
  eventType: string,
  data: Record<string, unknown>,
  conversationId?: string | null,
  taskId?: string | null,
) {
  try {
    await supabase.from("main_ai_audit_events").insert({
      user_id: userId,
      conversation_id: conversationId ?? null,
      task_id: taskId ?? null,
      event_type: eventType,
      event_data: data,
    });
  } catch {
    // audit is best-effort; never break the calling flow
  }
}

async function assertConversationOwner(supabase: any, userId: string, id: string) {
  const { data, error } = await supabase
    .from("main_ai_conversations")
    .select("id, user_id, title, status")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.user_id !== userId) throw new Error("Konversationen hittades inte");
  return data as { id: string; user_id: string; title: string; status: string };
}

// ---------- Conversations ----------

export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("main_ai_conversations")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []) as Conversation[];
  });

export const createConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const v = input as { title?: string };
    return { title: (v?.title ?? "").trim() || "Ny konversation" };
  })
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("main_ai_conversations")
      .insert({ user_id: context.userId, title: data.title, status: "active" })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await logAudit(context.supabase, context.userId, "conversation.created", { id: row.id }, row.id);
    return row as Conversation;
  });

export const renameConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const v = input as { conversationId?: string; title?: string };
    if (!v?.conversationId) throw new Error("conversationId krävs");
    const title = (v?.title ?? "").trim();
    if (!title) throw new Error("Titel krävs");
    return { conversationId: v.conversationId, title: title.slice(0, 120) };
  })
  .handler(async ({ context, data }) => {
    await assertConversationOwner(context.supabase, context.userId, data.conversationId);
    const { data: row, error } = await context.supabase
      .from("main_ai_conversations")
      .update({ title: data.title, updated_at: new Date().toISOString() })
      .eq("id", data.conversationId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await logAudit(context.supabase, context.userId, "conversation.renamed", { id: row.id }, row.id);
    return row as Conversation;
  });

export const archiveConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const v = input as { conversationId?: string; archived?: boolean };
    if (!v?.conversationId) throw new Error("conversationId krävs");
    return { conversationId: v.conversationId, archived: v.archived !== false };
  })
  .handler(async ({ context, data }) => {
    await assertConversationOwner(context.supabase, context.userId, data.conversationId);
    const nextStatus = data.archived ? "archived" : "active";
    const { data: row, error } = await context.supabase
      .from("main_ai_conversations")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", data.conversationId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await logAudit(
      context.supabase,
      context.userId,
      data.archived ? "conversation.archived" : "conversation.unarchived",
      { id: row.id },
      row.id,
    );
    return row as Conversation;
  });

// ---------- Messages ----------

export const listMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const v = input as { conversationId?: string };
    if (!v?.conversationId) throw new Error("conversationId krävs");
    return { conversationId: v.conversationId };
  })
  .handler(async ({ context, data }) => {
    await assertConversationOwner(context.supabase, context.userId, data.conversationId);
    const { data: rows, error } = await context.supabase
      .from("main_ai_messages")
      .select("*")
      .eq("conversation_id", data.conversationId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []) as Message[];
  });

function friendlyProviderError(code: string): string {
  switch (code) {
    case "provider_timeout":
      return "AI-svaret tog för lång tid. Försök igen.";
    case "provider_rate_limited":
      return "AI-tjänsten är tillfälligt överbelastad. Försök igen om en stund.";
    case "provider_auth_failed":
      return "AI-providern avvisade anropet. Kontrollera GEMINI_API_KEY.";
    case "provider_unavailable":
      return "AI-tjänsten är för närvarande otillgänglig.";
    case "provider_bad_request":
      return "Anropet till AI-providern kunde inte tolkas.";
    case "provider_empty_response":
      return "AI-providern returnerade ett tomt svar.";
    default:
      return "Ett okänt fel uppstod vid AI-anropet.";
  }
}

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const v = input as { conversationId?: string; content?: string };
    if (!v?.conversationId) throw new Error("conversationId krävs");
    const content = (v?.content ?? "").trim();
    if (!content) throw new Error("Meddelandet är tomt");
    if (content.length > MAX_USER_MESSAGE_CHARS) {
      throw new Error(`Meddelandet är för långt (max ${MAX_USER_MESSAGE_CHARS} tecken).`);
    }
    return { conversationId: v.conversationId, content };
  })
  .handler(async ({ context, data }) => {
    const conv = await assertConversationOwner(context.supabase, context.userId, data.conversationId);

    // Save user message first (never dropped even if AI later fails)
    const { data: userMsg, error: umErr } = await context.supabase
      .from("main_ai_messages")
      .insert({
        conversation_id: data.conversationId,
        user_id: context.userId,
        role: "user" as MessageRole,
        content: data.content,
        status: "ok",
      })
      .select("*")
      .single();
    if (umErr) throw new Error(umErr.message);

    await logAudit(
      context.supabase,
      context.userId,
      "message.user_sent",
      { message_id: userMsg.id, chars: data.content.length },
      data.conversationId,
    );

    // Auto-title from first user message
    if (!conv.title || conv.title === "Ny konversation") {
      const newTitle = data.content.replace(/\s+/g, " ").slice(0, 60).trim();
      if (newTitle) {
        await context.supabase
          .from("main_ai_conversations")
          .update({ title: newTitle, updated_at: new Date().toISOString() })
          .eq("id", data.conversationId);
      }
    } else {
      await context.supabase
        .from("main_ai_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", data.conversationId);
    }

    const { getProviderStatus, getActiveProvider } = await import("./provider");
    const status = getProviderStatus();

    if (!status.configured) {
      const { data: sysMsg } = await context.supabase
        .from("main_ai_messages")
        .insert({
          conversation_id: data.conversationId,
          user_id: context.userId,
          role: "system" as MessageRole,
          content: status.reason,
          status: "provider_missing",
          error_message: "no_provider_configured",
        })
        .select("*")
        .single();

      await logAudit(
        context.supabase,
        context.userId,
        "provider.missing",
        {},
        data.conversationId,
      );

      return {
        userMessage: userMsg as Message,
        assistantMessage: null,
        systemMessage: (sysMsg ?? null) as Message | null,
        providerConfigured: false as const,
      };
    }

    // Build context: trimmed recent history
    const { data: history } = await context.supabase
      .from("main_ai_messages")
      .select("role, content")
      .eq("conversation_id", data.conversationId)
      .in("role", ["user", "assistant"])
      .order("created_at", { ascending: false })
      .limit(HISTORY_LIMIT);

    const ordered = (history ?? []).reverse() as Array<{ role: MessageRole; content: string }>;
    const messages: Array<{ role: MessageRole; content: string }> = [
      {
        role: "system",
        content:
          "Du är MainAI, en hjälpsam svensk projektassistent för appen My Money Master. Svara koncist och på svenska om användaren inte skriver på annat språk.",
      },
      ...ordered.map((m) => ({
        role: m.role,
        content: m.content.length > MAX_CONTENT_CHARS ? m.content.slice(0, MAX_CONTENT_CHARS) : m.content,
      })),
    ];

    const provider = getActiveProvider()!;
    try {
      const result = await provider.generate({ messages });
      const { data: aiMsg, error: aiErr } = await context.supabase
        .from("main_ai_messages")
        .insert({
          conversation_id: data.conversationId,
          user_id: context.userId,
          role: "assistant" as MessageRole,
          content: result.content,
          provider: result.provider,
          model: result.model,
          status: "ok",
        })
        .select("*")
        .single();
      if (aiErr) throw new Error(aiErr.message);

      await context.supabase
        .from("main_ai_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", data.conversationId);

      await logAudit(
        context.supabase,
        context.userId,
        "message.assistant_received",
        {
          message_id: aiMsg.id,
          provider: result.provider,
          model: result.model,
          prompt_tokens: result.usage?.promptTokens ?? null,
          completion_tokens: result.usage?.completionTokens ?? null,
        },
        data.conversationId,
      );

      return {
        userMessage: userMsg as Message,
        assistantMessage: aiMsg as Message,
        providerConfigured: true as const,
        provider: result.provider,
        model: result.model,
      };
    } catch (err: any) {
      const code = typeof err?.message === "string" ? err.message : "provider_unknown";
      await logAudit(
        context.supabase,
        context.userId,
        "provider.request_failed",
        { code, provider: provider.name, model: provider.defaultModel },
        data.conversationId,
      );
      throw new Error(friendlyProviderError(code));
    }
  });

// ---------- Tasks ----------

const ALLOWED_TASK_STATUS = new Set([
  "draft",
  "planned",
  "awaiting_approval",
  "running",
  "review",
  "completed",
  "blocked",
  "cancelled",
  "pending", // backwards compat with existing rows
]);
const ALLOWED_RISK = new Set(["low", "medium", "high"]);

export const createTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const v = input as {
      title?: string;
      description?: string;
      conversationId?: string | null;
      riskLevel?: "low" | "medium" | "high";
      requiresApproval?: boolean;
    };
    const title = (v?.title ?? "").trim();
    if (!title) throw new Error("Titel krävs");
    return {
      title: title.slice(0, 200),
      description: (v?.description ?? "").trim() || null,
      conversationId: v?.conversationId ?? null,
      riskLevel: v?.riskLevel ?? "low",
      requiresApproval: v?.requiresApproval ?? false,
    };
  })
  .handler(async ({ context, data }) => {
    if (data.conversationId) {
      await assertConversationOwner(context.supabase, context.userId, data.conversationId);
    }
    const { data: row, error } = await context.supabase
      .from("main_ai_tasks")
      .insert({
        user_id: context.userId,
        conversation_id: data.conversationId,
        title: data.title,
        description: data.description,
        risk_level: data.riskLevel,
        requires_approval: data.requiresApproval,
        status: "draft",
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await logAudit(context.supabase, context.userId, "task.created", { id: row.id }, data.conversationId, row.id);
    return row as Task;
  });

export const updateTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const v = input as {
      id?: string;
      title?: string;
      description?: string | null;
      status?: string;
      riskLevel?: "low" | "medium" | "high";
      requiresApproval?: boolean;
    };
    if (!v?.id) throw new Error("id krävs");
    if (v.status && !ALLOWED_TASK_STATUS.has(v.status)) throw new Error("Ogiltig status");
    if (v.riskLevel && !ALLOWED_RISK.has(v.riskLevel)) throw new Error("Ogiltig risknivå");
    return v;
  })
  .handler(async ({ context, data }) => {
    // ownership check
    const { data: existing } = await context.supabase
      .from("main_ai_tasks")
      .select("id, user_id")
      .eq("id", data.id!)
      .maybeSingle();
    if (!existing || existing.user_id !== context.userId) throw new Error("Uppgiften hittades inte");

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.title !== undefined) patch.title = (data.title ?? "").trim().slice(0, 200);
    if (data.description !== undefined) patch.description = data.description;
    if (data.status !== undefined) patch.status = data.status;
    if (data.riskLevel !== undefined) patch.risk_level = data.riskLevel;
    if (data.requiresApproval !== undefined) patch.requires_approval = data.requiresApproval;

    const { data: row, error } = await context.supabase
      .from("main_ai_tasks")
      .update(patch)
      .eq("id", data.id!)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await logAudit(context.supabase, context.userId, "task.updated", { id: row.id, fields: Object.keys(patch) }, row.conversation_id, row.id);
    return row as Task;
  });

export const listTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("main_ai_tasks")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []) as Task[];
  });

// ---------- Approvals ----------

export const listPendingApprovals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("main_ai_approvals")
      .select("*")
      .eq("status", "pending")
      .order("requested_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const decideApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const v = input as { id?: string; decision?: "approved" | "rejected"; reason?: string };
    if (!v?.id) throw new Error("id krävs");
    if (v.decision !== "approved" && v.decision !== "rejected") throw new Error("Ogiltigt beslut");
    return { id: v.id, decision: v.decision, reason: (v.reason ?? "").slice(0, 500) || null };
  })
  .handler(async ({ context, data }) => {
    const { data: existing } = await context.supabase
      .from("main_ai_approvals")
      .select("id, user_id, status")
      .eq("id", data.id)
      .maybeSingle();
    if (!existing || existing.user_id !== context.userId) throw new Error("Godkännandet hittades inte");
    if (existing.status !== "pending") throw new Error("Beslut redan fattat");

    const { data: row, error } = await context.supabase
      .from("main_ai_approvals")
      .update({
        status: data.decision,
        decided_at: new Date().toISOString(),
        decision_reason: data.reason,
      })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await logAudit(
      context.supabase,
      context.userId,
      data.decision === "approved" ? "approval.approved" : "approval.rejected",
      { id: row.id },
    );
    return row;
  });

// ---------- Audit ----------

export const listRecentAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("main_ai_audit_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return (data ?? []) as AuditEvent[];
  });

export const getProviderStatusFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { getProviderStatus } = await import("./provider");
    return getProviderStatus();
  });
