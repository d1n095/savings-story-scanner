-- Lägg till passtyp och jourfält på shifts
DO $$ BEGIN
  CREATE TYPE public.shift_type AS ENUM ('regular', 'waking_on_call', 'sleeping_on_call', 'standby');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.shifts
  ADD COLUMN IF NOT EXISTS shift_type public.shift_type NOT NULL DEFAULT 'regular',
  ADD COLUMN IF NOT EXISTS on_call_hours numeric,
  ADD COLUMN IF NOT EXISTS active_minutes integer NOT NULL DEFAULT 0;

-- Nya satser på arbetsprofil
ALTER TABLE public.work_profiles
  ADD COLUMN IF NOT EXISTS waking_on_call_rate numeric,
  ADD COLUMN IF NOT EXISTS sleeping_on_call_rate numeric,
  ADD COLUMN IF NOT EXISTS callout_rate numeric;

-- Index för range-frågor över midnatt
CREATE INDEX IF NOT EXISTS shifts_user_starts_ends_idx
  ON public.shifts (user_id, starts_at, ends_at);