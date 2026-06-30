
-- Work profiles (förbereder flera arbetsgivare)
CREATE TABLE IF NOT EXISTS public.work_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Standard',
  is_default boolean NOT NULL DEFAULT false,
  employer text,
  workplace text,
  occupation text,
  collective_agreement text,
  hourly_rate numeric DEFAULT 0,
  monthly_salary numeric,
  tax_rate numeric DEFAULT 30,
  ob_rules jsonb DEFAULT '[]'::jsonb,
  overtime_rules jsonb DEFAULT '{}'::jsonb,
  vacation_days_per_year integer DEFAULT 25,
  vab_rate numeric,
  sick_pay_rate numeric,
  per_diem numeric,
  mileage_rate numeric,
  pension_pct numeric,
  bonus_rules jsonb DEFAULT '{}'::jsonb,
  commission_rules jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_profiles TO authenticated;
GRANT ALL ON public.work_profiles TO service_role;

ALTER TABLE public.work_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own work profiles" ON public.work_profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_work_profiles_updated_at BEFORE UPDATE ON public.work_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Koppling från shifts till work profile
ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS work_profile_id uuid REFERENCES public.work_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_work_profiles_user ON public.work_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_shifts_work_profile ON public.shifts(work_profile_id);

-- Säkerställ max en default per användare
CREATE UNIQUE INDEX IF NOT EXISTS uniq_default_work_profile_per_user
  ON public.work_profiles(user_id) WHERE is_default = true;
