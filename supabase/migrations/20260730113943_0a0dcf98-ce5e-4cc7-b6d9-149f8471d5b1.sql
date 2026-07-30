-- Persistent per-user module installation state for the Life Store
CREATE TABLE IF NOT EXISTS public.module_installations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  module_id text NOT NULL,
  version text NOT NULL,
  status text NOT NULL DEFAULT 'installed',
  enabled boolean NOT NULL DEFAULT true,
  granted_permissions text[] NOT NULL DEFAULT '{}',
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  failure_reason text,
  installed_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT module_installations_user_module_key UNIQUE (user_id, module_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.module_installations TO authenticated;
GRANT ALL ON public.module_installations TO service_role;

ALTER TABLE public.module_installations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own module installations" ON public.module_installations;
CREATE POLICY "own module installations"
  ON public.module_installations FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_module_installations_updated_at ON public.module_installations;
CREATE TRIGGER update_module_installations_updated_at
  BEFORE UPDATE ON public.module_installations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS module_installations_user_idx ON public.module_installations (user_id);

-- Lifecycle audit trail for module actions
CREATE TABLE IF NOT EXISTS public.module_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  module_id text NOT NULL,
  action text NOT NULL,
  success boolean NOT NULL DEFAULT true,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.module_audit_events TO authenticated;
GRANT ALL ON public.module_audit_events TO service_role;

ALTER TABLE public.module_audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own module audit select" ON public.module_audit_events;
CREATE POLICY "own module audit select"
  ON public.module_audit_events FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own module audit insert" ON public.module_audit_events;
CREATE POLICY "own module audit insert"
  ON public.module_audit_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS module_audit_events_user_idx ON public.module_audit_events (user_id, created_at DESC);