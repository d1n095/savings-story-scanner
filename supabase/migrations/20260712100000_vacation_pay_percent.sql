-- PAY-003: Vacation pay percent (semesterersättning) on work_profiles
-- Default 12% for hourly workers per Swedish labor law.
ALTER TABLE public.work_profiles
  ADD COLUMN IF NOT EXISTS vacation_pay_percent NUMERIC(5,2) NOT NULL DEFAULT 12.0
    CHECK (vacation_pay_percent >= 0 AND vacation_pay_percent <= 50);

COMMENT ON COLUMN public.work_profiles.vacation_pay_percent IS
  'Semesterersättning i % av bruttolön. Default 12 % (lag om semesterersättning för timanställda).';
