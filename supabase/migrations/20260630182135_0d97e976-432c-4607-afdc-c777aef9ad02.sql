
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.timeline_kind AS ENUM ('shift','expense','income','reminder','holiday','nameday','signal','note','health','travel','document');
CREATE TYPE public.signal_severity AS ENUM ('info','warning','critical');
CREATE TYPE public.expense_category AS ENUM ('mat','transport','boende','noje','prenumeration','klader','halsa','sparande','overforing','annat');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  hourly_rate NUMERIC(10,2) DEFAULT 0,
  tax_rate NUMERIC(5,2) DEFAULT 30,
  monthly_buffer_goal NUMERIC(12,2) DEFAULT 0,
  collective_agreement TEXT DEFAULT 'eget',
  ob_rules JSONB DEFAULT '[]'::jsonb,
  onboarded BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "see own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ============ SHIFTS (Calendar+Salary) ============
CREATE TABLE public.shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  break_minutes INT NOT NULL DEFAULT 0,
  hourly_rate NUMERIC(10,2),
  ob_amount NUMERIC(12,2) DEFAULT 0,
  base_amount NUMERIC(12,2) DEFAULT 0,
  total_amount NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  is_extra BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shifts TO authenticated;
GRANT ALL ON public.shifts TO service_role;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own shifts all" ON public.shifts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX shifts_user_starts ON public.shifts(user_id, starts_at DESC);

-- ============ EXPENSES ============
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  category expense_category NOT NULL DEFAULT 'annat',
  description TEXT,
  merchant TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT,
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own expenses all" ON public.expenses FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX expenses_user_date ON public.expenses(user_id, occurred_at DESC);

-- ============ TIMELINE EVENTS (alla engines skriver hit) ============
CREATE TABLE public.timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind timeline_kind NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  occurs_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  amount NUMERIC(12,2),
  icon TEXT,
  color TEXT,
  source_table TEXT,
  source_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.timeline_events TO authenticated;
GRANT ALL ON public.timeline_events TO service_role;
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own timeline all" ON public.timeline_events FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX timeline_user_when ON public.timeline_events(user_id, occurs_at DESC);

-- ============ SIGNALS (proaktiva insikter) ============
CREATE TABLE public.signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  severity signal_severity NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  body TEXT,
  action_label TEXT,
  action_path TEXT,
  dismissed BOOLEAN DEFAULT false,
  pinned BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.signals TO authenticated;
GRANT ALL ON public.signals TO service_role;
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own signals all" ON public.signals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX signals_user_active ON public.signals(user_id, created_at DESC) WHERE dismissed = false;

-- ============ AI MEMORY ============
CREATE TABLE public.ai_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  fact TEXT NOT NULL,
  confidence NUMERIC(3,2) DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_memory TO authenticated;
GRANT ALL ON public.ai_memory TO service_role;
ALTER TABLE public.ai_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own memory all" ON public.ai_memory FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ REMINDERS ============
CREATE TABLE public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  notes TEXT,
  remind_at TIMESTAMPTZ NOT NULL,
  done BOOLEAN DEFAULT false,
  recurrence TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reminders TO authenticated;
GRANT ALL ON public.reminders TO service_role;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own reminders all" ON public.reminders FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ TRIGGERS ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER shifts_updated BEFORE UPDATE ON public.shifts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile + default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
