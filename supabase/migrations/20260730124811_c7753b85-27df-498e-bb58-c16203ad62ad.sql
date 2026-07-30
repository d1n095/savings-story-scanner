-- ==========================================================
-- Träningsmodulen (training) — additiv, icke-destruktiv
-- ==========================================================

CREATE TYPE public.training_exercise_type AS ENUM ('strength', 'cardio', 'mobility', 'other');
CREATE TYPE public.training_session_status AS ENUM ('planned', 'completed', 'cancelled');

-- ---------- Mallar ----------
CREATE TABLE public.training_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  notes text,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT training_templates_owner_key UNIQUE (id, user_id),
  CONSTRAINT training_templates_name_not_blank CHECK (length(btrim(name)) > 0)
);
CREATE INDEX training_templates_user_idx ON public.training_templates (user_id, archived, name);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_templates TO authenticated;
GRANT ALL ON public.training_templates TO service_role;
ALTER TABLE public.training_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "training_templates_own" ON public.training_templates
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------- Mallövningar ----------
CREATE TABLE public.training_template_exercises (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  template_id uuid NOT NULL,
  name text NOT NULL,
  exercise_type public.training_exercise_type NOT NULL DEFAULT 'strength',
  sort_order integer NOT NULL DEFAULT 0,
  planned_sets integer,
  planned_reps integer,
  planned_weight_kg numeric(7,2),
  planned_duration_min numeric(7,2),
  planned_distance_km numeric(7,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT training_template_exercises_owner_key UNIQUE (id, user_id),
  CONSTRAINT training_template_exercises_template_fk
    FOREIGN KEY (template_id, user_id)
    REFERENCES public.training_templates (id, user_id) ON DELETE CASCADE,
  CONSTRAINT training_template_exercises_name_not_blank CHECK (length(btrim(name)) > 0)
);
CREATE INDEX training_template_exercises_template_idx
  ON public.training_template_exercises (template_id, sort_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_template_exercises TO authenticated;
GRANT ALL ON public.training_template_exercises TO service_role;
ALTER TABLE public.training_template_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "training_template_exercises_own" ON public.training_template_exercises
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------- Pass (planerade + genomförda) ----------
CREATE TABLE public.training_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  template_id uuid,
  title text NOT NULL,
  scheduled_on date NOT NULL,
  scheduled_time time,
  status public.training_session_status NOT NULL DEFAULT 'planned',
  completed_at timestamptz,
  duration_min numeric(7,2),
  perceived_effort integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT training_sessions_owner_key UNIQUE (id, user_id),
  CONSTRAINT training_sessions_template_fk
    FOREIGN KEY (template_id, user_id)
    REFERENCES public.training_templates (id, user_id) ON DELETE SET NULL,
  CONSTRAINT training_sessions_title_not_blank CHECK (length(btrim(title)) > 0),
  CONSTRAINT training_sessions_effort_range CHECK (perceived_effort IS NULL OR perceived_effort BETWEEN 1 AND 10)
);
CREATE INDEX training_sessions_user_date_idx ON public.training_sessions (user_id, scheduled_on DESC);
CREATE INDEX training_sessions_user_status_idx ON public.training_sessions (user_id, status, scheduled_on DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_sessions TO authenticated;
GRANT ALL ON public.training_sessions TO service_role;
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "training_sessions_own" ON public.training_sessions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------- Passövningar ----------
CREATE TABLE public.training_session_exercises (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  session_id uuid NOT NULL,
  name text NOT NULL,
  exercise_type public.training_exercise_type NOT NULL DEFAULT 'strength',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT training_session_exercises_owner_key UNIQUE (id, user_id),
  CONSTRAINT training_session_exercises_session_fk
    FOREIGN KEY (session_id, user_id)
    REFERENCES public.training_sessions (id, user_id) ON DELETE CASCADE,
  CONSTRAINT training_session_exercises_name_not_blank CHECK (length(btrim(name)) > 0)
);
CREATE INDEX training_session_exercises_session_idx
  ON public.training_session_exercises (session_id, sort_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_session_exercises TO authenticated;
GRANT ALL ON public.training_session_exercises TO service_role;
ALTER TABLE public.training_session_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "training_session_exercises_own" ON public.training_session_exercises
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------- Loggade set / mätvärden ----------
CREATE TABLE public.training_sets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  session_exercise_id uuid NOT NULL,
  set_index integer NOT NULL DEFAULT 1,
  reps integer,
  weight_kg numeric(7,2),
  duration_min numeric(7,2),
  distance_km numeric(7,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT training_sets_exercise_fk
    FOREIGN KEY (session_exercise_id, user_id)
    REFERENCES public.training_session_exercises (id, user_id) ON DELETE CASCADE,
  CONSTRAINT training_sets_unique_index UNIQUE (session_exercise_id, set_index)
);
CREATE INDEX training_sets_exercise_idx ON public.training_sets (session_exercise_id, set_index);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_sets TO authenticated;
GRANT ALL ON public.training_sets TO service_role;
ALTER TABLE public.training_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "training_sets_own" ON public.training_sets
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------- updated_at-triggers ----------
CREATE TRIGGER training_templates_touch BEFORE UPDATE ON public.training_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER training_template_exercises_touch BEFORE UPDATE ON public.training_template_exercises
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER training_sessions_touch BEFORE UPDATE ON public.training_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER training_session_exercises_touch BEFORE UPDATE ON public.training_session_exercises
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER training_sets_touch BEFORE UPDATE ON public.training_sets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();