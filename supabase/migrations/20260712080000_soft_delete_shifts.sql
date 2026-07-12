-- PKT-03: Add soft-delete support to shifts
-- All shift deletions go through deleted_at; hard DELETE is never used from client code.
ALTER TABLE public.shifts
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Partial index: only live (non-deleted) shifts are scanned in date-range queries
CREATE INDEX IF NOT EXISTS shifts_user_starts_active_idx
  ON public.shifts (user_id, starts_at DESC)
  WHERE deleted_at IS NULL;
