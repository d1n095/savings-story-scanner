# Löneavstämning före omräkning

**Truth & Trust: ingen historisk data ändras. Ingen tyst fallback. Motorn säger tydligt när något inte kan verifieras.**

Steg 1 (från förra planen) är klart för raster på *nya* pass. Nu stoppar vi all historisk omräkning och bygger verifieringsinfrastrukturen innan en enda gammal siffra rörs.

---

## Fas A — Frys historiken (0 beräkningsändringar)

**A1. Markera all historik som ej verifierad**
- Migration: lägg till `shifts.verification_status` (`unverified` | `pending_review` | `verified` | `manual_override`) — default `unverified` för allt befintligt.
- Migration: lägg till `shifts.original_import_snapshot jsonb` (fylls med nuvarande belopp *en gång* för alla gamla pass så originalet aldrig går förlorat).
- Migration: lägg till `shifts.pay_snapshot jsonb` (nuvarande beräkning fryst — inte omräknad).
- UI: badge "Ej verifierad" på alla gamla pass i kalender/planering/idag.

**A2. Slå av all bakgrundsomräkning**
- Sök i koden efter varje ställe som skriver till `shifts.total_amount` / `base_amount` / `ob_amount` för *befintliga* rader. Endast nya pass (via `computeShiftAmounts` vid create) får skriva pay-fält. Uppdatering av gammal rad → kräver explicit "räkna om"-knapp (byggs i Fas E).

---

## Fas B — Riktig tidsmodell (utan att röra gamla värden)

Utöka `shifts` med separata tidsfält (alla nullbara, gamla rader lämnas orörda):
- `scheduled_minutes` (schemalagd närvarotid)
- `gross_span_minutes` (start→slut)
- `unpaid_break_minutes`, `paid_break_minutes`
- `worked_minutes` (faktiskt arbetad)
- `payable_minutes` (lönegrundande)
- `ordinary_minutes`, `mertid_minutes`, `overtime_simple_minutes`, `overtime_qualified_minutes`
- `on_call_waking_minutes`, `on_call_sleeping_minutes`, `standby_minutes`, `on_call_active_minutes`
- `absence_minutes`, `rounded_minutes`
- `time_model_version` (så vi vet vilken tidsmodell som gäller för raden)

Alla UI-vyer som visar "Timmar" måste specificera vilken sort (default: lönegrundande, med tooltip).

## Fas C — Specificerade lönerader

Ny tabell `pay_lines`:
```
id, shift_id, pay_period_id (nullable),
pay_code (ordinarie|ob_kvall|ob_natt|ob_helg|ob_storhelg|mertid|
          ot_enkel|ot_kvalificerad|jour_vaken|jour_sovande|
          beredskap|jour_aktiv|semester_ers|tillagg|avdrag|...),
units_type (timmar|dagar|styck|kronor),
units numeric, rate numeric, amount numeric,
applied_rule_id, rule_valid_from, rule_valid_to,
source (engine|payslip|manual),
verification_status,
notes
```
Salary Engine returnerar en array av `pay_lines` istället för aggregat. Aggregaten (`base_amount`, `ob_amount`, `total_amount`) blir *härledda* för bakåtkompatibilitet.

## Fas D — Regler med giltighetsdatum + hårt stopp vid saknad regel

Ny tabell `pay_rules`:
```
id, work_profile_id, workplace_id (null=alla),
pay_code, rate_type (fixed|multiplier|percent),
rate numeric, unit (per_hour|per_shift|per_occurrence),
valid_from date, valid_to date (null=öppen),
condition jsonb (t.ex. veckodag, tidsintervall, helgtyp),
source (avtal|lonebesked|manuell), verification_status
```

**Truth & Trust-implementation i engine:**
- Ingen fallback till "ordinarie timlön" för sovande jour.
- Saknas regel för `pay_code` + datum → engine returnerar `pay_line` med `amount=null`, `status='missing_rule'`, `reason='Ersättningsregel saknas för sovande jour 2026-06-30'`.
- UI visar rött: "Kan inte verifieras — regel saknas". Ingen siffra hittas på.

## Fas E — Lönebeskedsimport & avstämning

**E1. Payslip-datamodell**
```
payslips (id, user_id, employer, period_start, period_end, payday, gross, net, tax, source_file, status)
payslip_lines (id, payslip_id, pay_code, units, rate, amount, raw_label, confidence, matched_shift_ids[])
```

**E2. Import**
- Utökar Import Engine (samma scanner) med klassificering `payslip`.
- OCR/parse → föreslår `pay_code`-mappning för okända etiketter → confidence per fält.
- **Inga automatiska skrivningar.** Landar i `payslips` med status=`pending_review`.

**E3. Avstämningsvy `/lon/avstamning/:period`**
Tre kolumner rad för rad:
| Löneart | Schema (A) | Engine (B) | Lönebesked (C) | Diff | Trolig orsak |
Diff-motor pekar ut orsak: `missing_rule`, `rate_mismatch`, `hours_mismatch`, `shift_missing`, `unknown_pay_code`, `break_rule_diff`, `rounding`.

**E4. Diagnosrapport** (Fas 8 i din spec) — samma vy, körs read-only, inga DB-ändringar.

## Fas F — Säker periodvis omräkning

Först när en period är avstämd:
- Knapp "Räkna om period med verifierade regler".
- Förhandsgranskning: antal pass, gamla vs nya `pay_lines`, total diff, regler som används, orsak per ändring.
- Skriver ny `pay_snapshot` + sätter `verification_status='verified'`. Sparar `previous_snapshot` för rollback.
- Aldrig blint på hela historiken. Aldrig utan lönebesked som referens.

---

## Teknisk ordning (så inget bryts)

1. Migration A1+A2 (frys + snapshot original).
2. Sluta skriva pay-fält till existerande rader från alla nuvarande code paths.
3. Migration B (tidsfält) + C (`pay_lines`) + D (`pay_rules`).
4. Refaktor `computeShiftAmounts` → `computeShift(): { time, pay_lines[], missing[] }`. Behåll aggregat-getters för UI som ännu inte migrerats.
5. UI: "Ej verifierad"-badges + specificerade lönerader i pass-detalj.
6. Migration E (payslips) + Import Engine-utökning + avstämningsvy.
7. Diagnosrapport för en verklig period (som du väljer).
8. Först då: Fas F-knappen för den periodens omräkning.

## Vad ändras INTE

- Inga befintliga belopp skrivs över.
- Ingen dold fallback läggs till någonstans.
- Ingen AI, inga betalda API:er.
- Ingen omräkning startas automatiskt.

---

## Vad jag behöver från dig innan jag börjar

1. **Godkännande att köra Fas A + B + C + D som migrations** (skapar tabeller/kolumner, rör inga värden).
2. Ett verkligt lönebesked (PDF/bild) för *en* period att avstämma mot först — det driver Fas E och validerar hela kedjan.
3. Vilken arbetsgivare/period vi ska börja med.

Säg **"kör Fas A–D"** så börjar jag med migrationerna (utan att röra en enda historisk siffra), och sen väntar jag på lönebeskedet innan Fas E.
