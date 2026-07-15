-- Steg 1: städ innan Work/Salary Engine byggs om.
-- 1) Ta bort dubblett-pass (behåll äldsta per (user_id, starts_at, ends_at))
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, starts_at, ends_at
           ORDER BY created_at ASC, id ASC
         ) AS rn
  FROM public.shifts
)
DELETE FROM public.shifts
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 2) Nollställ legacy pay på profiles. Lön hör hemma i work_profiles.
--    Rör bara pay-fälten, inte identitet/preferenser.
UPDATE public.profiles
SET hourly_rate = NULL,
    tax_rate = NULL,
    ob_rules = '[]'::jsonb
WHERE COALESCE(hourly_rate, 0) > 0
   OR COALESCE(tax_rate, 0) > 0
   OR (ob_rules IS NOT NULL AND ob_rules::text NOT IN ('[]', 'null'));
