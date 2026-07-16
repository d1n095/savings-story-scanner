
-- MainAI Foundation v0.1 — additive only

CREATE TABLE public.main_ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Ny konversation',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.main_ai_conversations TO authenticated;
GRANT ALL ON public.main_ai_conversations TO service_role;
ALTER TABLE public.main_ai_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own conversations" ON public.main_ai_conversations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_main_ai_conversations_user ON public.main_ai_conversations(user_id, updated_at DESC);

CREATE TABLE public.main_ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.main_ai_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant','system','tool')),
  content text NOT NULL,
  provider text,
  model text,
  status text NOT NULL DEFAULT 'ok',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.main_ai_messages TO authenticated;
GRANT ALL ON public.main_ai_messages TO service_role;
ALTER TABLE public.main_ai_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own messages" ON public.main_ai_messages
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_main_ai_messages_conv ON public.main_ai_messages(conversation_id, created_at ASC);

CREATE TABLE public.main_ai_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.main_ai_conversations(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',
  risk_level text NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low','medium','high')),
  requires_approval boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.main_ai_tasks TO authenticated;
GRANT ALL ON public.main_ai_tasks TO service_role;
ALTER TABLE public.main_ai_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tasks" ON public.main_ai_tasks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_main_ai_tasks_user ON public.main_ai_tasks(user_id, created_at DESC);

CREATE TABLE public.main_ai_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.main_ai_tasks(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.main_ai_approvals TO authenticated;
GRANT ALL ON public.main_ai_approvals TO service_role;
ALTER TABLE public.main_ai_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own approvals" ON public.main_ai_approvals
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_main_ai_approvals_user ON public.main_ai_approvals(user_id, status, requested_at DESC);

CREATE TABLE public.main_ai_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.main_ai_conversations(id) ON DELETE SET NULL,
  task_id uuid REFERENCES public.main_ai_tasks(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  event_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.main_ai_audit_events TO authenticated;
GRANT ALL ON public.main_ai_audit_events TO service_role;
ALTER TABLE public.main_ai_audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own audit events" ON public.main_ai_audit_events
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_main_ai_audit_user ON public.main_ai_audit_events(user_id, created_at DESC);

CREATE TRIGGER update_main_ai_conversations_updated_at
  BEFORE UPDATE ON public.main_ai_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_main_ai_tasks_updated_at
  BEFORE UPDATE ON public.main_ai_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
