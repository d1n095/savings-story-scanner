import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Brain, Plus, Send, Shield, Activity, ListTodo, AlertCircle,
  MessageSquare, PanelLeft, PanelRight, Archive, Pencil, Check, X, Loader2,
} from "lucide-react";
import {
  listConversations, createConversation, renameConversation, archiveConversation,
  listMessages, sendMessage,
  createTask, listTasks, updateTask,
  listPendingApprovals, decideApproval,
  listRecentAudit, getProviderStatusFn,
} from "@/modules/main-ai/main-ai-service.functions";
import type { Conversation, Message, Task, AuditEvent, ProviderStatus } from "@/modules/main-ai/types";

export const Route = createFileRoute("/_app/main-ai")({
  component: MainAIPage,
});

const TASK_STATUSES = [
  "draft", "planned", "awaiting_approval", "running", "review", "completed", "blocked", "cancelled",
] as const;

function MainAIPage() {
  const fnListConv = useServerFn(listConversations);
  const fnCreateConv = useServerFn(createConversation);
  const fnRenameConv = useServerFn(renameConversation);
  const fnArchiveConv = useServerFn(archiveConversation);
  const fnListMsg = useServerFn(listMessages);
  const fnSend = useServerFn(sendMessage);
  const fnCreateTask = useServerFn(createTask);
  const fnUpdateTask = useServerFn(updateTask);
  const fnListTasks = useServerFn(listTasks);
  const fnListApprovals = useServerFn(listPendingApprovals);
  const fnDecide = useServerFn(decideApproval);
  const fnListAudit = useServerFn(listRecentAudit);
  const fnStatus = useServerFn(getProviderStatusFn);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [status, setStatus] = useState<ProviderStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [renameFor, setRenameFor] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeConv = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );

  const visibleConvs = useMemo(
    () => conversations.filter((c) => (showArchived ? c.status === "archived" : c.status !== "archived")),
    [conversations, showArchived],
  );

  async function refreshAll() {
    try {
      const [c, t, a, ev, s] = await Promise.all([
        fnListConv(), fnListTasks(), fnListApprovals(), fnListAudit(), fnStatus(),
      ]);
      setConversations(c);
      setTasks(t);
      setApprovals(a);
      setAudit(ev);
      setStatus(s);
      if (!activeId && c.length > 0) {
        const firstActive = c.find((x) => x.status !== "archived") ?? c[0];
        setActiveId(firstActive!.id);
      }
    } catch (e: any) {
      setErr(e?.message ?? "Kunde inte hämta MainAI-data");
    }
  }

  async function refreshMessages(id: string) {
    try {
      const m = await fnListMsg({ data: { conversationId: id } });
      setMessages(m);
    } catch (e: any) {
      setErr(e?.message ?? "Kunde inte hämta meddelanden");
    }
  }

  useEffect(() => { refreshAll(); /* eslint-disable-next-line */ }, []);
  useEffect(() => {
    if (activeId) refreshMessages(activeId); else setMessages([]);
    /* eslint-disable-next-line */
  }, [activeId]);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);
  useEffect(() => { textareaRef.current?.focus(); }, [activeId]);

  async function handleNewConversation() {
    setErr(null);
    try {
      const c = await fnCreateConv({ data: { title: "Ny konversation" } });
      setConversations((prev) => [c, ...prev]);
      setActiveId(c.id);
      setLeftOpen(false);
      refreshAll();
    } catch (e: any) {
      setErr(e?.message ?? "Kunde inte skapa konversation");
    }
  }

  async function handleSend() {
    if (!activeId || !input.trim() || busy) return;
    setBusy(true);
    setErr(null);
    const content = input.trim();
    // Optimistic user message
    const optimistic: Message = {
      id: `tmp-${Date.now()}`,
      conversation_id: activeId,
      user_id: "",
      role: "user",
      content,
      provider: null,
      model: null,
      status: "ok",
      error_message: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    const savedInput = input;
    setInput("");
    try {
      await fnSend({ data: { conversationId: activeId, content } });
      await refreshMessages(activeId);
      // refresh conversations to pick up auto-title
      fnListConv().then(setConversations).catch(() => {});
      fnListAudit().then(setAudit).catch(() => {});
    } catch (e: any) {
      // Restore input, keep the optimistic user msg (server saved it before failing)
      setInput(savedInput);
      setErr(e?.message ?? "Kunde inte skicka meddelande");
      // Sync from server so user sees the real saved user msg
      refreshMessages(activeId).catch(() => {});
    } finally {
      setBusy(false);
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  }

  async function handleCreateTask() {
    const title = newTaskTitle.trim();
    if (!title) return;
    setErr(null);
    try {
      await fnCreateTask({ data: { title, conversationId: activeId, riskLevel: "low", requiresApproval: false } });
      setNewTaskTitle("");
      await refreshAll();
    } catch (e: any) {
      setErr(e?.message ?? "Kunde inte skapa arbetsuppgift");
    }
  }

  async function handleTaskStatus(t: Task, status: string) {
    try {
      await fnUpdateTask({ data: { id: t.id, status } });
      await refreshAll();
    } catch (e: any) {
      setErr(e?.message ?? "Kunde inte uppdatera uppgift");
    }
  }

  async function handleDecide(id: string, decision: "approved" | "rejected") {
    try {
      await fnDecide({ data: { id, decision } });
      await refreshAll();
    } catch (e: any) {
      setErr(e?.message ?? "Kunde inte spara beslut");
    }
  }

  async function submitRename() {
    if (!renameFor || !renameValue.trim()) { setRenameFor(null); return; }
    try {
      await fnRenameConv({ data: { conversationId: renameFor, title: renameValue.trim() } });
      setRenameFor(null);
      await refreshAll();
    } catch (e: any) {
      setErr(e?.message ?? "Kunde inte byta namn");
    }
  }

  async function toggleArchive(c: Conversation) {
    try {
      await fnArchiveConv({ data: { conversationId: c.id, archived: c.status !== "archived" } });
      if (activeId === c.id && c.status !== "archived") setActiveId(null);
      await refreshAll();
    } catch (e: any) {
      setErr(e?.message ?? "Kunde inte arkivera");
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Top header (compact) */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <button
          onClick={() => setLeftOpen((v) => !v)}
          className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground lg:hidden"
          aria-label="Konversationer"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Brain className="h-4 w-4 shrink-0 text-[oklch(0.85_0.12_85)]" />
          <div className="truncate text-sm font-medium">
            {activeConv?.title ?? "MainAI"}
          </div>
        </div>
        <ProviderStatusBadge status={status} compact />
        <button
          onClick={() => setRightOpen((v) => !v)}
          className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground xl:hidden"
          aria-label="Uppgifter"
        >
          <PanelRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[260px_1fr] xl:grid-cols-[260px_1fr_300px]">
        {/* LEFT: Conversations */}
        <aside
          className={
            "min-h-0 border-r border-border bg-surface/40 " +
            (leftOpen
              ? "fixed inset-y-0 left-0 top-0 z-40 w-72 lg:static lg:z-auto"
              : "hidden lg:flex") +
            " lg:flex lg:flex-col"
          }
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Konversationer</div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowArchived((v) => !v)}
                className={
                  "rounded-lg border border-border px-2 py-1 text-[10px] " +
                  (showArchived ? "text-foreground" : "text-muted-foreground")
                }
              >
                {showArchived ? "Aktiva" : "Arkiv"}
              </button>
              <button
                onClick={handleNewConversation}
                className="grid h-7 w-7 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground"
                aria-label="Ny konversation"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setLeftOpen(false)}
                className="grid h-7 w-7 place-items-center rounded-lg border border-border text-muted-foreground lg:hidden"
                aria-label="Stäng"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
            {visibleConvs.length === 0 && (
              <li className="rounded-lg px-2 py-3 text-xs text-muted-foreground">
                {showArchived ? "Inga arkiverade." : "Ingen konversation ännu."}
              </li>
            )}
            {visibleConvs.map((c) => (
              <li key={c.id} className="group relative">
                {renameFor === c.id ? (
                  <div className="flex items-center gap-1 rounded-lg border border-border p-1">
                    <input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") submitRename();
                        if (e.key === "Escape") setRenameFor(null);
                      }}
                      autoFocus
                      className="flex-1 rounded bg-background/60 px-1.5 py-1 text-xs outline-none"
                    />
                    <button onClick={submitRename} className="grid h-6 w-6 place-items-center text-emerald-400">
                      <Check className="h-3 w-3" />
                    </button>
                    <button onClick={() => setRenameFor(null)} className="grid h-6 w-6 place-items-center text-muted-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div
                    className={
                      "flex items-center gap-1 rounded-lg px-1 " +
                      (activeId === c.id ? "bg-white/[0.06]" : "hover:bg-white/[0.03]")
                    }
                  >
                    <button
                      onClick={() => { setActiveId(c.id); setLeftOpen(false); }}
                      className="min-w-0 flex-1 truncate px-1.5 py-2 text-left text-sm"
                    >
                      <div className="truncate">{c.title}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(c.updated_at).toLocaleString("sv-SE")}
                      </div>
                    </button>
                    <button
                      onClick={() => { setRenameFor(c.id); setRenameValue(c.title); }}
                      className="grid h-6 w-6 place-items-center text-muted-foreground opacity-0 hover:text-foreground group-hover:opacity-100"
                      aria-label="Byt namn"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => toggleArchive(c)}
                      className="grid h-6 w-6 place-items-center text-muted-foreground opacity-0 hover:text-foreground group-hover:opacity-100"
                      aria-label={c.status === "archived" ? "Återställ" : "Arkivera"}
                    >
                      <Archive className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </aside>

        {/* MIDDLE: Chat */}
        <section className="flex min-h-0 min-w-0 flex-col bg-background/40">
          {err && (
            <div className="flex items-start gap-2 border-b border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="flex-1">{err}</span>
              <button onClick={() => setErr(null)} className="opacity-70 hover:opacity-100">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {!activeConv && (
              <div className="grid h-full place-items-center text-center">
                <div className="max-w-sm space-y-3">
                  <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Skapa en ny konversation för att börja.
                  </p>
                  <button
                    onClick={handleNewConversation}
                    className="rounded-xl border border-border px-3 py-2 text-sm hover:bg-white/[0.04]"
                  >
                    Ny konversation
                  </button>
                </div>
              </div>
            )}
            {activeConv && messages.length === 0 && (
              <p className="text-sm text-muted-foreground">Inga meddelanden ännu. Skriv nedan för att börja.</p>
            )}
            {messages.map((m) => <MessageBubble key={m.id} message={m} />)}
            {busy && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>AI:n tänker…</span>
              </div>
            )}
          </div>
          <div className="border-t border-border p-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={activeConv ? "Skriv ett meddelande… (Enter för att skicka)" : "Skapa en konversation först"}
                disabled={!activeConv || busy}
                rows={2}
                className="min-h-[44px] max-h-40 flex-1 resize-none rounded-xl border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-foreground/30 disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={!activeConv || busy || !input.trim()}
                className="grid h-11 w-11 place-items-center rounded-xl bg-foreground text-background disabled:opacity-40"
                aria-label="Skicka"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </section>

        {/* RIGHT: Panels */}
        <aside
          className={
            "min-h-0 border-l border-border bg-surface/40 " +
            (rightOpen
              ? "fixed inset-y-0 right-0 top-0 z-40 w-80 xl:static xl:z-auto"
              : "hidden xl:flex") +
            " xl:flex xl:flex-col"
          }
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2 xl:hidden">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Paneler</div>
            <button
              onClick={() => setRightOpen(false)}
              className="grid h-7 w-7 place-items-center rounded-lg border border-border text-muted-foreground"
              aria-label="Stäng"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
            <Panel title="Arbetsuppgifter" icon={<ListTodo className="h-3.5 w-3.5" />}>
              <div className="mb-2 flex gap-2">
                <input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateTask()}
                  placeholder="Ny arbetsuppgift…"
                  className="flex-1 rounded-lg border border-border bg-background/60 px-2.5 py-1.5 text-xs outline-none focus:border-foreground/30"
                />
                <button
                  onClick={handleCreateTask}
                  disabled={!newTaskTitle.trim()}
                  className="rounded-lg border border-border px-2 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
                >
                  Lägg till
                </button>
              </div>
              <ul className="space-y-1.5">
                {tasks.length === 0 && <li className="text-xs text-muted-foreground">Inga uppgifter.</li>}
                {tasks.slice(0, 8).map((t) => (
                  <li key={t.id} className="rounded-lg border border-border px-2.5 py-1.5 text-xs">
                    <div className="truncate">{t.title}</div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <select
                        value={t.status}
                        onChange={(e) => handleTaskStatus(t, e.target.value)}
                        className="rounded border border-border bg-background/60 px-1 py-0.5 text-[10px]"
                      >
                        {[...TASK_STATUSES, t.status].filter((v, i, a) => a.indexOf(v) === i).map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        risk: {t.risk_level}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel title="Väntande godkännanden" icon={<Shield className="h-3.5 w-3.5" />}>
              {approvals.length === 0 ? (
                <div className="text-xs text-muted-foreground">Inga väntande godkännanden.</div>
              ) : (
                <ul className="space-y-1.5">
                  {approvals.map((a) => (
                    <li key={a.id} className="rounded-lg border border-border px-2.5 py-1.5 text-xs">
                      <div className="truncate">{a.action_type}</div>
                      <div className="mt-1 flex gap-1.5">
                        <button
                          onClick={() => handleDecide(a.id, "approved")}
                          className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-200"
                        >
                          Godkänn
                        </button>
                        <button
                          onClick={() => handleDecide(a.id, "rejected")}
                          className="rounded border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-[10px] text-destructive"
                        >
                          Avslå
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Senaste aktivitet" icon={<Activity className="h-3.5 w-3.5" />}>
              {audit.length === 0 ? (
                <div className="text-xs text-muted-foreground">Ingen aktivitet ännu.</div>
              ) : (
                <ul className="space-y-1">
                  {audit.slice(0, 12).map((a) => (
                    <li key={a.id} className="text-[11px] text-muted-foreground">
                      <span className="text-foreground">{a.event_type}</span>{" "}
                      · {new Date(a.created_at).toLocaleTimeString("sv-SE")}
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </aside>
      </div>

      {(leftOpen || rightOpen) && (
        <div
          onClick={() => { setLeftOpen(false); setRightOpen(false); }}
          className="fixed inset-0 z-30 bg-black/40 xl:hidden"
        />
      )}
    </div>
  );
}

function ProviderStatusBadge({ status, compact }: { status: ProviderStatus | null; compact?: boolean }) {
  if (!status) {
    return <div className="rounded-lg border border-border px-2 py-1 text-[10px] text-muted-foreground">…</div>;
  }
  if (!status.configured) {
    return (
      <div
        title={status.reason}
        className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-200"
      >
        {compact ? "Ingen provider" : status.reason}
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-200">
      {status.provider} · {status.model}
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  return (
    <div className={"flex " + (isUser ? "justify-end" : "justify-start")}>
      <div
        className={
          "max-w-[85%] rounded-2xl px-3 py-2 text-sm " +
          (isUser
            ? "bg-foreground text-background"
            : isSystem
              ? "border border-amber-500/40 bg-amber-500/10 text-amber-100"
              : "border border-border bg-surface/60 text-foreground")
        }
      >
        <div className="mb-0.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wider opacity-60">
          <span>{message.role}</span>
          {message.provider && <span>· {message.provider}</span>}
          {message.model && <span>· {message.model}</span>}
        </div>
        <div className="whitespace-pre-wrap">{message.content}</div>
      </div>
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/40 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
        {icon}<span>{title}</span>
      </div>
      {children}
    </div>
  );
}
