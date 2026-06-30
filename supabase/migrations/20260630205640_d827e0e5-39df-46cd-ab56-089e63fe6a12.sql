
CREATE TABLE public.user_defaults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key text NOT NULL,
  value jsonb NOT NULL,
  confidence int NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_defaults TO authenticated;
GRANT ALL ON public.user_defaults TO service_role;
ALTER TABLE public.user_defaults ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own defaults" ON public.user_defaults FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER user_defaults_updated_at BEFORE UPDATE ON public.user_defaults
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
