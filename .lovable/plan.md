# Planning Engine — Vecka / Månad / Halvår / År

Bygger ovanpå befintliga Calendar Engine + Salary Engine. Allt regelstyrt, inga AI-kostnader.

## 1. Databas (migration)

Nya tabeller (alla med RLS scoped till `auth.uid()`, GRANT till `authenticated` + `service_role`):

- **`absences`** — semester/sjuk/VAB/tjänstledigt. Fält: `user_id`, `kind` (enum: `vacation|sick|vab|leave|other`), `starts_on`, `ends_on`, `note`, `paid` (bool), `status` (`planned|approved|taken`).
- **`weekly_patterns`** — återanvändbara veckomönster. Fält: `user_id`, `name`, `days_json` (jsonb: `[{weekday, from, to, break_minutes, template_id?}]`).
- **`rotations`** — roterande scheman (2-skift, 3-skift, dag/kväll/natt). Fält: `user_id`, `name`, `weeks_json` (jsonb: array av weekly_patterns per rotationsvecka), `cycle_weeks`.
- **`vacation_balance`** — semesterkonto. Fält: `user_id`, `year`, `total_days`, `used_days`, `saved_days`.
- **(förberedande för Business)** `teams`, `team_members` — skapas men oanvända i UI nu, redo för chef-vyn senare.

## 2. Planning Engine-modul (`src/modules/planning/`)

- `views.ts` — aggregering: hours/brutto/netto/OB/röda dagar/semester per dag/vecka/månad/kvartal/halvår/år. Använder befintlig `calculateShift` + `holidaysForYear`.
- `tax.ts` — enkel netto-uppskattning (svensk schablon, justerbar i inställningar; default 30%).
- `vacation.ts` — semesteranalys: räkna semesterdagar (vardagar), totalt lediga (inkl. helger/röda dagar), påverkade pass, förlorad OB, "stretch"-förslag (lägg till en dag → X extra lediga).
- `rotations.ts` — expandera rotation till konkreta veckor över valt intervall.
- `conflicts.ts` (utöka befintlig) — semesterkrock med pass, dubbelbokning av frånvaro, vilotid <11h mellan pass, >40h/vecka, >50h/vecka.

## 3. UI — `/jobb` blir Planning Hub

Behåller befintlig Shift Engine men lägger till **vy-växlare** högst upp: Dag · Vecka · Månad · Kvartal · Halvår · År.

- **Vecko-vy** (default): 7 rader (mån–sön), klicka in tider direkt eller välj mall-chip. "Spara vecka" → batch-insert. Live-summa: timmar, brutto, netto, OB, pass, lediga, varningar.
- **Månadsvy**: kalendergrid med pass-pillar per dag, röda dagar markerade, semester-overlay. Knappar: "Kopiera förra månaden", "Använd mönster", "Mån–fre 08–16 hela månaden", "Varannan helg".
- **Kvartal/Halvår**: 3/6 mini-månader sida vid sida med summa-rad per månad.
- **År-vy**: 12 månadskort. Varje kort: timmar, brutto, netto, OB, semesterdagar, röda dagar. Klick → drill-down.
- **Drill-down**: År → Månad → Vecka → Dag → Passdetalj (varje nivå är en route-state, inte ny route — håll det enkelt).

## 4. Semesterpanel (`/jobb` flik "Semester")

- Markera datumintervall i kalender → visa:
  - semesterdagar förbrukade (vardagar)
  - totalt lediga (med helger/röda)
  - påverkade pass (lista)
  - förlorad OB (kr)
  - "stretch-tips": "Lägg till fredag → 4 extra lediga dagar"
- Spara → skriv till `absences` + skapa `timeline_events`.
- Semesterkonto-widget (år, kvar, använt).

## 5. Rotationer & mönster (flik "Mönster")

- Skapa weekly_pattern visuellt (7 rader).
- Skapa rotation (N veckor av patterns).
- "Applicera på period" → välj startdatum + slutdatum → expand → conflict check → bulk-insert.
- Snabb-presets: 2-skift (dag/kväll), 3-skift (dag/kväll/natt), Nattvecka, Varannan helg.

## 6. Varningar (utbyggd `conflicts.ts`)

Visa som chip-lista i varje vy:
- >40h/vecka (gult), >50h (rött)
- <11h vila mellan pass
- semester över befintliga pass
- dubbelbokad frånvaro
- saknad rast på 6h+
- ovanligt låg/hög OB (jmf användarens snitt)

## 7. Inställningar (`/installningar`)

Lägg till sektion "Lön & skatt":
- Skattesats (slider 0–60%, default 30%)
- Semesterdagar/år (default 25)
- Min vila mellan pass (default 11h)
- Max timmar/vecka varning (default 40)

## 8. Design

- Vy-växlare = segmented control (Champagne gold accent på aktiv).
- Månadsgrid: glas-effekt, röda dagar i mjuk röd-orange, semester i champagne, pass i pearl.
- Sammanfattningskort: stora siffror, små labels, progress-bars för månads-mål.
- Inga 500 knappar — primär CTA + 2–3 mall-chips per vy.

## 9. Vad jag INTE bygger nu (markeras "kommer snart")

- Drag/drop pass mellan dagar (mycket UI-arbete, lägger till i version 2).
- Team-vy/godkännandeflöde (tabeller skapas, UI senare).
- Importera schema från Medvind PDF (separat senare).

## Teknisk översikt (för dig som vill veta)

- Allt aggregat beräknas client-side från en enda `shifts`-query för perioden — inga nya RPC:er behövs.
- React Query keys per period (`["planning", userId, "month", "2026-07"]`) för snabb drill-down utan refetch.
- Semester-overlay = `absences`-query filtrerad på samma intervall.
- Rotationsexpand sker i minnet innan batch-insert.

Säg klart så kör jag migration + kod.
