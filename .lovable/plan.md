
# Kalender & Planning Engine — Refaktorering

Målet: kalendern blir appens nav. Planning Engine planerar bara — inga löneinställningar. Allt modulärt så framtida engines (Health, Travel, Documents…) kan skriva in i samma kalender utan refaktor.

## 1. Arkitektur — en kanal för allt

Allt som händer en viss dag går in i `timeline_events` (tabellen finns redan). Det blir kalenderns enda källa. Övriga tabeller (`shifts`, `expenses`, `absences`, `reminders`, namnsdagar, röda dagar) projiceras in via en gemensam adapter.

```text
shifts ─┐
expenses ┤
absences ┤──▶ calendarSource(date) ──▶ DayEvents ──▶ UI
reminders┤
holidays ┤      (deterministisk merge, ingen AI-kostnad)
namedays ┘
```

Ny modul: `src/modules/calendar/source.ts`
- `getEventsForRange(from, to)` — slår ihop alla källor till färgkodade events.
- `getDaySummary(date)` — timmar, brutto, netto, OB, utgifter, inkomster, semester, anteckningar.
- Indikatorfärger: 🔵 pass, 🟢 lön/inkomst, 🟡 påminnelse, 🔴 räkning/utgift, 🟣 semester, ⚪ insikt, ⭐ namnsdag, 🟥 röd dag.

Framtida moduler registrerar sig genom att skriva till `timeline_events` med `kind`-fält — inga UI-ändringar krävs.

## 2. Routes — separera kalender, planering, inställningar

| Route | Roll |
|---|---|
| `/kalender` | **Nytt nav**. Månadsvy default, dagspanel, "Idag"-knapp, auto-scroll till idag, klick→DayPanel. |
| `/planering` | Endast planering. View-switch: Dag · Vecka · Månad · Kvartal · Halvår · År. Zoom-flöde År→Halvår→Månad→Vecka→Dag→Pass. Läser löneregler från profil — sätter dem inte. |
| `/installningar/lon-arbete` | **Ny**. All permanent löne-/arbetskonfig (se §4). |
| `/jobb` | Behålls som snabbinmatning av pass (Shift Engine). |

Sidomeny: lägg till "Kalender" överst och "Inställningar" längst ner.

## 3. Kalender-UI (`/kalender`)

**Månadsgrid** (default):
- Dagens datum: guldring, mörkare bakgrund, "Idag"-pill, mjuk glow.
- Varje cell: datumnummer + max 4 färgprickar (indikatorer), ingen text.
- Röda dagar och namnsdagar redan inkodade lokalt.
- Knappar: ‹ › Idag · vy-switch (Månad/Vecka/Dag).

**DayPanel** (Sheet från höger på desktop, full-screen drawer på mobil):
- Header: datum · veckodag · namnsdag · röd dag-badge · väder-placeholder.
- Sektioner: Arbete (pass, brutto, netto, OB) · Ekonomi (utgifter, inkomster) · Frånvaro/Semester · Påminnelser · Anteckningar · AI-insikt (deterministisk).
- Snabbknappar: + Pass · + Utgift · + Inkomst · + Påminnelse · + Semester · + Anteckning. Var och en öppnar en liten dialog som skriver till rätt tabell + `timeline_events`.

**Vecka/Dag-vy**: kompakta varianter av samma DayPanel-data.

## 4. Inställningar → Lön & Arbete (`/installningar/lon-arbete`)

Migration utökar `profiles` med fält som saknas; resten lagras i ny `work_profiles` (förbereder flera arbetsgivare):

```text
work_profiles
  id, user_id, name (t.ex. "Securitas"), is_default
  employer, workplace, occupation, collective_agreement
  hourly_rate, monthly_salary, tax_rate
  ob_rules (jsonb: kvällar, helg, natt, röd dag, %-eller-kr)
  overtime_rules (jsonb)
  vacation_days_per_year, vab_rate, sick_pay_rate
  per_diem, mileage_rate, pension_pct, bonus_rules, commission_rules
```

`shifts` får `work_profile_id` (nullable, default = is_default).
Planning Engine och Salary Engine läser endast härifrån.

UI: en accordion per sektion (Grund · OB · Övertid · Frånvaro · Ersättningar · Pension/Bonus). Spara per sektion.

## 5. Planning Engine — rensad

Ta bort skatt/OB-inputs från `/planering`. Behåll och förbättra:
- View-switch Dag/Vecka/Månad/Kvartal/Halvår/År.
- Sammanfattningsremsa per nivå (enligt spec: dag/vecka/månad/år).
- Snabbplanering vecka: 7 rader, mallar, spara.
- Mönster (2-skift, 3-skift, varannan helg, mån–fre) — befintlig logik.
- Zoom-drilldown: klick på år→månad→vecka→dag→pass-redigering öppnar DayPanel.
- Varningar: dubbelbokning, för lite vila, saknad rast, semesterkrock, övertid (befintlig `conflicts.ts`, utökas med vila <11h).

## 6. Modularitet för framtida engines

Konvention dokumenteras i `src/modules/calendar/README.md`:
- Skriv till `timeline_events` med `kind` (`shift|expense|income|reminder|absence|travel|health|doc|insight|...`), `color`, `icon`, `title`, `subtitle`, `amount?`, `ref_table?`, `ref_id?`.
- Kalendern plockar upp dem automatiskt — ingen UI-ändring krävs.

## 7. Leverans (en runda)

1. Migration: `work_profiles` + `shifts.work_profile_id` + grants/RLS.
2. `src/modules/calendar/source.ts` + adapter för befintliga tabeller.
3. Ny route `/kalender` med MonthGrid + DayPanel + quick-add-dialoger.
4. Ny route `/installningar/lon-arbete` (flytta fält från profil/planering).
5. Refaktorera `/planering`: ta bort löneinputs, behåll planering + zoom + varningar; klick på dag öppnar DayPanel.
6. Sidomeny + redirect: gammal startpunkt → `/kalender`.
7. README för calendar-modulen.

Inga betalda AI-anrop. All logik deterministisk.

## Frågor innan jag bygger

1. **Startsida efter login** — ska `/kalender` bli ny default istället för `/dashboard`?
2. **Arbetsprofiler nu eller senare** — bygger jag in `work_profiles` direkt (rekommenderas, undviker migration nr 2), eller håller jag det till en enda profil i denna runda?
3. **DayPanel quick-add** — vill du ha alla 6 snabbknappar live direkt (Pass, Utgift, Inkomst, Påminnelse, Semester, Anteckning), eller räcker Pass + Utgift + Påminnelse i runda 1?
