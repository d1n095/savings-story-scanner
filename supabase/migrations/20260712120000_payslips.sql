-- =========================================================
-- PKT-08: PAYSLIPS TABLE (lönespecar / jämförelsemotor)
-- =========================================================
-- Lagrar skannade lönespecar och möjliggör jämförelse
-- mot appens egna beräkningar per löneperiod.
-- =========================================================

CREATE TABLE IF NOT EXISTS public.payslips (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  work_profile_id  UUID REFERENCES public.work_profiles(id) ON DELETE SET NULL,
  pay_period_id    UUID REFERENCES public.pay_periods(id) ON DELETE SET NULL,
  period_start     DATE NOT NULL,
  period_end       DATE NOT NULL,
  gross_salary     NUMERIC(12,2),
  net_salary       NUMERIC(12,2),
  tax_amount       NUMERIC(12,2),
  ob_amount        NUMERIC(12,2),
  on_call_amount   NUMERIC(12,2),
  vacation_pay     NUMERIC(12,2),
  overtime_amount  NUMERIC(12,2),
  total_hours      NUMERIC(8,2),
  ocr_raw          TEXT,
  verified_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMPTZ,
  CONSTRAINT payslips_range_chk CHECK (period_end >= period_start)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payslips TO authenticated;
GRANT ALL ON public.payslips TO service_role;

ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own payslips" ON public.payslips;
CREATE POLICY "own payslips" ON public.payslips
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS tr_payslips_upd ON public.payslips;
CREATE TRIGGER tr_payslips_upd
  BEFORE UPDATE ON public.payslips
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_payslips_period ON public.payslips(pay_period_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payslips_user   ON public.payslips(user_id, period_start DESC) WHERE deleted_at IS NULL;

COMMENT ON TABLE public.payslips IS
  'Skannade lönespecar. Jämförs mot shifts-beräkningar för samma period (ADR-001).';
