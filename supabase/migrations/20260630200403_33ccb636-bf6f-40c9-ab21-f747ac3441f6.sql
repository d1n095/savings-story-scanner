-- Frånvaro (semester, sjuk, VAB, tjänstledighet)
CREATE TYPE absence_kind AS ENUM ('vacation','sick','vab','leave','other');
CREATE TYPE absence_status AS ENUM ('planned','approved','taken');

CREATE TABLE public.absences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  kind absence_kind NOT NULL DEFAULT 'vacation',
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  note TEXT,
  paid BOOLEAN NOT NULL DEFAULT true,
  status absence_status NOT NULL DEFAULT 'planned',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.absences TO authenticated;
GRANT ALL ON public.absences TO service_role;
ALTER TABLE public.absences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own absences" ON public.absences FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER tr_absences_upd BEFORE UPDATE ON public.absences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_absences_user_range ON public.absences(user_id, starts_on, ends_on);

-- Veckomönster
CREATE TABLE public.weekly_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  days_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_patterns TO authenticated;
GRANT ALL ON public.weekly_patterns TO service_role;
ALTER TABLE public.weekly_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own patterns" ON public.weekly_patterns FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER tr_wpat_upd BEFORE UPDATE ON public.weekly_patterns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Rotationer
CREATE TABLE public.rotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  cycle_weeks INT NOT NULL DEFAULT 1,
  weeks_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rotations TO authenticated;
GRANT ALL ON public.rotations TO service_role;
ALTER TABLE public.rotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own rotations" ON public.rotations FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER tr_rot_upd BEFORE UPDATE ON public.rotations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Semesterkonto per år
CREATE TABLE public.vacation_balance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  year INT NOT NULL,
  total_days NUMERIC NOT NULL DEFAULT 25,
  used_days NUMERIC NOT NULL DEFAULT 0,
  saved_days NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, year)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vacation_balance TO authenticated;
GRANT ALL ON public.vacation_balance TO service_role;
ALTER TABLE public.vacation_balance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own vacbal" ON public.vacation_balance FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER tr_vacbal_upd BEFORE UPDATE ON public.vacation_balance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Förberedande för Business (UI kommer senare)
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT ALL ON public.teams TO service_role;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner teams" ON public.teams FOR ALL
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER tr_teams_upd BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team members visible to team owner or self" ON public.team_members FOR SELECT
  USING (auth.uid() = user_id OR EXISTS(SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.owner_id = auth.uid()));
CREATE POLICY "team owner manages members" ON public.team_members FOR ALL
  USING (EXISTS(SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.owner_id = auth.uid()))
  WITH CHECK (EXISTS(SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.owner_id = auth.uid()));

-- Lägg till user settings för skatt/vacation om saknas på profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tax_rate NUMERIC NOT NULL DEFAULT 0.30,
  ADD COLUMN IF NOT EXISTS vacation_days_per_year INT NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS min_rest_hours INT NOT NULL DEFAULT 11,
  ADD COLUMN IF NOT EXISTS max_week_hours INT NOT NULL DEFAULT 40;
