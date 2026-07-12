-- =========================================================
-- PAY SNAPSHOTS + AUDIT LOG (PKT-07 / ADR-001)
-- =========================================================
-- Historiska pass = oföränderliga fakta.
-- pay_snapshot: sanning om HUR lönen räknades för ett pass.
-- pay_recompute_log: audit trail för godkända omräkningar.
-- guard_locked_shift_pay: DB-trigger som skyddar låsta perioder.
-- =========================================================

-- 1. Snapshot-kolumner på shifts
ALTER TABLE public.shifts
  ADD COLUMN IF NOT EXISTS pay_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS pay_engine_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS pay_computed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.shifts.pay_snapshot IS
  'Oföränderlig snapshot av beräkningsgrunden (timlön, regler, breakdown) vid beräkningstillfället. Ändras bara via godkänd recompute. Se ADR-001.';
COMMENT ON COLUMN public.shifts.pay_engine_version IS
  'Version av lönemotorn som skapade denna beräkning. Används vid framtida migrering av snapshots.';
COMMENT ON COLUMN public.shifts.pay_computed_at IS
  'Tidpunkt då pay_snapshot senast beräknades/bekräftades.';

-- 2. Audit-logg för recompute
CREATE TABLE IF NOT EXISTS public.pay_recompute_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shift_id       UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  reason         TEXT NOT NULL,
  old_total      NUMERIC(12,2),
  new_total      NUMERIC(12,2),
  old_snapshot   JSONB,
  new_snapshot   JSONB,
  recomputed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.pay_recompute_log TO authenticated;
GRANT ALL ON public.pay_recompute_log TO service_role;

ALTER TABLE public.pay_recompute_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own recompute_log read" ON public.pay_recompute_log;
DROP POLICY IF EXISTS "own recompute_log insert" ON public.pay_recompute_log;

CREATE POLICY "own recompute_log read" ON public.pay_recompute_log
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own recompute_log insert" ON public.pay_recompute_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_recompute_log_shift ON public.pay_recompute_log(shift_id);
CREATE INDEX IF NOT EXISTS idx_recompute_log_user  ON public.pay_recompute_log(user_id, recomputed_at DESC);

-- 3. Guard trigger: förhindra ändring av löneposter i låsta perioder
CREATE OR REPLACE FUNCTION public.guard_locked_shift_pay()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  locked BOOLEAN;
BEGIN
  IF (NEW.base_amount IS DISTINCT FROM OLD.base_amount
      OR NEW.ob_amount IS DISTINCT FROM OLD.ob_amount
      OR NEW.total_amount IS DISTINCT FROM OLD.total_amount
      OR NEW.pay_snapshot IS DISTINCT FROM OLD.pay_snapshot) THEN
    IF OLD.pay_period_id IS NOT NULL THEN
      SELECT pp.is_locked INTO locked
        FROM public.pay_periods pp
       WHERE pp.id = OLD.pay_period_id;
      IF locked THEN
        RAISE EXCEPTION 'Kan inte ändra lön på ett pass i en låst (utbetald) period.';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_shifts_guard_locked ON public.shifts;
CREATE TRIGGER tr_shifts_guard_locked
  BEFORE UPDATE ON public.shifts
  FOR EACH ROW EXECUTE FUNCTION public.guard_locked_shift_pay();
