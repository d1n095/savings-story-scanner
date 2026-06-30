
ALTER TABLE public.work_profiles
  ADD COLUMN IF NOT EXISTS break_rules jsonb NOT NULL DEFAULT '{"mode":"manual","auto":[],"min_break_minutes":0}'::jsonb,
  ADD COLUMN IF NOT EXISTS overtime_rules jsonb NOT NULL DEFAULT '{"daily_after_hours":8,"weekly_after_hours":40,"multiplier":1.5}'::jsonb,
  ADD COLUMN IF NOT EXISTS on_call_rate numeric,
  ADD COLUMN IF NOT EXISTS standby_rate numeric,
  ADD COLUMN IF NOT EXISTS max_hours_per_day numeric,
  ADD COLUMN IF NOT EXISTS max_hours_per_week numeric,
  ADD COLUMN IF NOT EXISTS min_daily_rest_hours numeric DEFAULT 11,
  ADD COLUMN IF NOT EXISTS default_shift_from text,
  ADD COLUMN IF NOT EXISTS default_shift_to text;
