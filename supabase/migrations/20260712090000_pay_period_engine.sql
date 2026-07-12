-- PKT-04: Löneperiodmotor (salary period engine)
-- Adds period config to work_profiles, pay_periods table, and pay_period_id to shifts.
-- This is the foundation for "intjänat ≠ utbetalt" separation.

-- 1. Period config on work_profiles
ALTER TABLE public.work_profiles
  ADD COLUMN IF NOT EXISTS period_start_day  SMALLINT NOT NULL DEFAULT 1
    CHECK (period_start_day BETWEEN 1 AND 28),
  ADD COLUMN IF NOT EXISTS payday_day        SMALLINT NOT NULL DEFAULT 25
    CHECK (payday_day BETWEEN 1 AND 31),
  ADD COLUMN IF NOT EXISTS payday_offset_months SMALLINT NOT NULL DEFAULT 1
    CHECK (payday_offset_months BETWEEN 0 AND 3);

COMMENT ON COLUMN public.work_profiles.period_start_day IS
  'Vilket datum i månaden en ny löneperiod börjar (1-28). Default 1 = kalendermånad.';
COMMENT ON COLUMN public.work_profiles.payday_day IS
  'Vilket datum lönen betalas ut. Default 25.';
COMMENT ON COLUMN public.work_profiles.payday_offset_months IS
  'Hur många månader efter periodslut lönen betalas (0=samma månad, 1=nästa månad). Default 1.';

-- 2. Pay periods table
CREATE TABLE IF NOT EXISTS public.pay_periods (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  work_profile_id UUID NOT NULL REFERENCES public.work_profiles(id) ON DELETE CASCADE,
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  payday          DATE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'closed', 'locked')),
  is_locked       BOOLEAN NOT NULL DEFAULT false,
  total_earned    NUMERIC(12,2),
  total_paid      NUMERIC(12,2),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pay_periods_no_overlap UNIQUE (work_profile_id, period_start)
);

GRANT SELECT, INSERT, UPDATE ON public.pay_periods TO authenticated;
GRANT ALL ON public.pay_periods TO service_role;
ALTER TABLE public.pay_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pay_periods" ON public.pay_periods
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_pay_periods_profile ON public.pay_periods(work_profile_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_pay_periods_user ON public.pay_periods(user_id, payday DESC);

-- Auto-update updated_at
CREATE TRIGGER pay_periods_updated_at BEFORE UPDATE ON public.pay_periods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Link shifts to pay periods
ALTER TABLE public.shifts
  ADD COLUMN IF NOT EXISTS pay_period_id UUID REFERENCES public.pay_periods(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_shifts_pay_period ON public.shifts(pay_period_id)
  WHERE pay_period_id IS NOT NULL;
