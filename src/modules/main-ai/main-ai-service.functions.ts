// Authenticated server functions for MainAI.
// No external AI calls in v0.1 — provider registry is empty; when no provider
// is configured we return a clear configuration error instead of a fake reply.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Conversation, Message, Task, AuditEvent, MessageRole } from "./types";

async function logAudit(
  supabase: any,
  userId: string,
  eventType: string,
  data: Record<string, unknown>,
  conversationId?: string | null,
  taskId?: string | null,
) {
  await supabase.from("main_ai_audit_events").insert({
    user_id: userId,
    conversation_id: conversationId ?? null,
    task_id: taskId ?? null,
    event_type: eventType,
    event_data: data,
  });
}

export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("main_ai_conversations")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(50);
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
      .insert({ user_id: context.userId, title: data.title })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await logAudit(context.supabase, context.userId, "conversation.created", { id: row.id }, row.id);
    return row as Conversation;
  });

export const listMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const v = input as { conversationId?: string };
    if (!v?.conversationId) throw new Error("conversationId krävs");
    return { conversationId: v.conversationId };
  })
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("main_ai_messages")
      .select("*")
      .eq("conversation_id", data.conversationId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []) as Message[];
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const v = input as { conversationId?: string; content?: string };
    if (!v?.conversationId) throw new Error("conversationId krävs");
    const content = (v?.content ?? "").trim();
    if (!content) throw new Error("Meddelandet är tomt");
    return { conversationId: v.conversationId, content };
  })
  .handler(async ({ context, data }) => {
    // Verify conversation ownership (RLS also enforces this; belt & braces)
    const { data: conv, error: convErr } = await context.supabase
      .from("main_ai_conversations")
      .select("id, user_id")
      .eq("id", data.conversationId)
      .maybeSingle();
    if (convErr) throw new Error(convErr.message);
    if (!conv) throw new Error("Konversationen hittades inte");

    // Save user message
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
      { message_id: userMsg.id },
      data.conversationId,
    );

    // Touch conversation updated_at
    await context.supabase
      .from("main_ai_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", data.conversationId);

    // Provider check — no external AI in v0.1
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
        { reason: status.reason },
        data.conversationId,
      );

      return {
        userMessage: userMsg as Message,
        assistantMessage: null,
        systemMessage: (sysMsg ?? null) as Message | null,
        providerConfigured: false as const,
      };
    }

    // Future: call provider here. Not implemented in v0.1.
    const provider = getActiveProvider()!;
    return {
      userMessage: userMsg as Message,
      assistantMessage: null,
      systemMessage: null,
      providerConfigured: true as const,
      provider: provider.name,
      model: provider.defaultModel,
    };
  });

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
      title,
      description: (v?.description ?? "").trim() || null,
      conversationId: v?.conversationId ?? null,
      riskLevel: v?.riskLevel ?? "low",
      requiresApproval: v?.requiresApproval ?? false,
    };
  })
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("main_ai_tasks")
      .insert({
        user_id: context.userId,
        conversation_id: data.conversationId,
        title: data.title,
        description: data.description,
        risk_level: data.riskLevel,
        requires_approval: data.requiresApproval,
        status: "pending",
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await logAudit(context.supabase, context.userId, "task.created", { id: row.id }, data.conversationId, row.id);
    return row as Task;
  });

export const listTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("main_ai_tasks")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []) as Task[];
  });

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

export const listRecentAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("main_ai_audit_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(25);
    if (error) throw new Error(error.message);
    return (data ?? []) as AuditEvent[];
  });

export const getProviderStatusFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { getProviderStatus } = await import("./provider");
    return getProviderStatus();
  });
