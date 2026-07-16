
-- Fas A: Freeze history. No values are changed; only new columns added.

DO $$ BEGIN
  CREATE TYPE public.shift_verification_status AS ENUM (
    'unverified', 'pending_review', 'verified', 'manual_override'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.shifts
  ADD COLUMN IF NOT EXISTS verification_status public.shift_verification_status NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS original_import_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS pay_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS snapshot_frozen_at timestamptz;

-- One-time snapshot of current values so the original is never lost.
-- Only fills rows that have not been snapshotted yet.
UPDATE public.shifts
SET
  original_import_snapshot = to_jsonb(shifts.*) - 'original_import_snapshot' - 'pay_snapshot' - 'verification_status' - 'snapshot_frozen_at',
  pay_snapshot = to_jsonb(shifts.*) - 'original_import_snapshot' - 'pay_snapshot' - 'verification_status' - 'snapshot_frozen_at',
  snapshot_frozen_at = now()
WHERE original_import_snapshot IS NULL;

CREATE INDEX IF NOT EXISTS shifts_verification_status_idx
  ON public.shifts(verification_status);
