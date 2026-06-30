
CREATE TABLE public.shift_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  starts_time TEXT NOT NULL,
  ends_time TEXT NOT NULL,
  break_minutes INTEGER NOT NULL DEFAULT 30,
  hourly_rate NUMERIC,
  color TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shift_templates TO authenticated;
GRANT ALL ON public.shift_templates TO service_role;
ALTER TABLE public.shift_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own templates" ON public.shift_templates
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_shift_templates_updated_at
  BEFORE UPDATE ON public.shift_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX shift_templates_user_idx ON public.shift_templates(user_id, sort_order);
