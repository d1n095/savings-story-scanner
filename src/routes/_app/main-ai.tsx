import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Brain, Plus, Send, Shield, Activity, ListTodo, AlertCircle } from "lucide-react";
import {
  listConversations,
  createConversation,
  listMessages,
  sendMessage,
  createTask,
  listTasks,
  listPendingApprovals,
  listRecentAudit,
  getProviderStatusFn,
} from "@/modules/main-ai/main-ai-service.functions";
import type { Conversation, Message, Task, AuditEvent, ProviderStatus } from "@/modules/main-ai/types";

export const Route = createFileRoute("/_app/main-ai")({
  component: MainAIPage,
});

function MainAIPage() {
  const fnListConv = useServerFn(listConversations);
  const fnCreateConv = useServerFn(createConversation);
  const fnListMsg = useServerFn(listMessages);
  const fnSend = useServerFn(sendMessage);
  const fnCreateTask = useServerFn(createTask);
  const fnListTasks = useServerFn(listTasks);
  const fnListApprovals = useServerFn(listPendingApprovals);
  const fnListAudit = useServerFn(listRecentAudit);
  const fnStatus = useServerFn(getProviderStatusFn);

  const [conversations, setConversations] = useState<Conversation[]>([]);
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

  const activeConv = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );

  async function refreshAll() {
    try {
      const [c, t, a, ev, s] = await Promise.all([
        fnListConv(),
        fnListTasks(),
        fnListApprovals(),
        fnListAudit(),
        fnStatus(),
      ]);
      setConversations(c);
      setTasks(t);
      setApprovals(a);
      setAudit(ev);
      setStatus(s);
      if (!activeId && c.length > 0) setActiveId(c[0]!.id);
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

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeId) refreshMessages(activeId);
    else setMessages([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  async function handleNewConversation() {
    setErr(null);
    try {
      const c = await fnCreateConv({ data: { title: "Ny konversation" } });
      setConversations((prev) => [c, ...prev]);
      setActiveId(c.id);
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
    setInput("");
    try {
      await fnSend({ data: { conversationId: activeId, content } });
      await refreshMessages(activeId);
      await refreshAll();
    } catch (e: any) {
      setErr(e?.message ?? "Kunde inte skicka meddelande");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateTask() {
    const title = newTaskTitle.trim();
    if (!title) return;
    setErr(null);
    try {
      await fnCreateTask({
        data: { title, conversationId: activeId, riskLevel: "low", requiresApproval: false },
      });
      setNewTaskTitle("");
      await refreshAll();
    } catch (e: any) {
      setErr(e?.message ?? "Kunde inte skapa arbetsuppgift");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <Brain className="h-3.5 w-3.5" /> Projekt: My Money Master
          </div>
          <h1 className="display mt-1 text-3xl">MainAI</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Central styrpunkt för framtida projekt-AI. Foundation v0.1 — read-only mot övriga moduler.
          </p>
        </div>
        <ProviderStatusBadge status={status} />
      </header>

      {err && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{err}</span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[260px_1fr_280px]">
        {/* Conversations */}
        <aside className="rounded-2xl border border-border bg-surface/40 p-3">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Konversationer</div>
            <button
              onClick={handleNewConversation}
              className="grid h-7 w-7 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground"
              aria-label="Ny konversation"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <ul className="space-y-1">
            {conversations.length === 0 && (
              <li className="rounded-lg px-2 py-3 text-xs text-muted-foreground">
                Ingen konversation ännu.
              </li>
            )}
            {conversations.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setActiveId(c.id)}
                  className={
                    "w-full truncate rounded-lg px-2.5 py-2 text-left text-sm transition " +
                    (activeId === c.id
                      ? "bg-white/[0.06] text-foreground"
                      : "text-muted-foreground hover:bg-white/[0.03] hover:text-foreground")
                  }
                >
                  <div className="truncate">{c.title}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {new Date(c.updated_at).toLocaleString("sv-SE")}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Chat */}
        <section className="flex min-h-[520px] flex-col rounded-2xl border border-border bg-surface/40">
          <div className="border-b border-border px-4 py-3">
            <div className="text-sm">
              {activeConv ? activeConv.title : "Välj eller skapa en konversation"}
            </div>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {!activeConv && (
              <p className="text-sm text-muted-foreground">
                Skapa en ny konversation för att börja.
              </p>
            )}
            {activeConv && messages.length === 0 && (
              <p className="text-sm text-muted-foreground">Inga meddelanden ännu.</p>
            )}
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
          </div>
          <div className="border-t border-border p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={activeConv ? "Skriv ett meddelande…" : "Skapa en konversation först"}
                disabled={!activeConv || busy}
                rows={2}
                className="min-h-[44px] flex-1 resize-none rounded-xl border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-foreground/30 disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={!activeConv || busy || !input.trim()}
                className="grid h-11 w-11 place-items-center rounded-xl bg-foreground text-background disabled:opacity-40"
                aria-label="Skicka"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        {/* Right column */}
        <aside className="space-y-4">
          <Panel title="Aktuell arbetsuppgift" icon={<ListTodo className="h-3.5 w-3.5" />}>
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
              {tasks.length === 0 && (
                <li className="text-xs text-muted-foreground">Inga uppgifter.</li>
              )}
              {tasks.slice(0, 5).map((t) => (
                <li key={t.id} className="rounded-lg border border-border px-2.5 py-1.5 text-xs">
                  <div className="truncate">{t.title}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <span>{t.status}</span>
                    <span>·</span>
                    <span>risk: {t.risk_level}</span>
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
                    {a.action_type}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Senaste aktivitet" icon={<Activity className="h-3.5 w-3.5" />}>
            {audit.length === 0 ? (
              <div className="text-xs text-muted-foreground">Ingen aktivitet ännu.</div>
            ) : (
              <ul className="space-y-1.5">
                {audit.slice(0, 8).map((a) => (
                  <li key={a.id} className="text-[11px] text-muted-foreground">
                    <span className="text-foreground">{a.event_type}</span>{" "}
                    · {new Date(a.created_at).toLocaleTimeString("sv-SE")}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function ProviderStatusBadge({ status }: { status: ProviderStatus | null }) {
  if (!status) {
    return (
      <div className="rounded-xl border border-border bg-surface/40 px-3 py-2 text-xs text-muted-foreground">
        Systemstatus: läser in…
      </div>
    );
  }
  if (!status.configured) {
    return (
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
        <div className="font-medium">Ingen AI-provider ansluten</div>
        <div className="text-[11px] opacity-80">{status.reason}</div>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
      <div className="font-medium">Provider: {status.provider}</div>
      <div className="text-[11px] opacity-80">Modell: {status.model}</div>
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
          "max-w-[80%] rounded-2xl px-3 py-2 text-sm " +
          (isUser
            ? "bg-foreground text-background"
            : isSystem
              ? "border border-amber-500/40 bg-amber-500/10 text-amber-100"
              : "border border-border bg-surface/60 text-foreground")
        }
      >
        <div className="mb-0.5 text-[10px] uppercase tracking-wider opacity-60">{message.role}</div>
        <div className="whitespace-pre-wrap">{message.content}</div>
      </div>
    </div>
  );
}

function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface/40 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
        {icon}
        <span>{title}</span>
      </div>
      {children}
    </div>
  );
}
