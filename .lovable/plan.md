## Mål

Bygga om grunden i tre motorer (Work · Salary · Expense) + gemensam Import Engine, enligt din designprincip: **en sanning, en datakälla, en beräkningsmotor**. Inga nya UI-features ovanpå nuvarande buggar. Vi går stegvis, verifierar efter varje steg, och river gammal parallell logik allt eftersom.

## Ordning (låst — inget hoppas över)

### STEG 1 — Diagnos & städ (denna vecka, ingen ny funktion)
1. Läs av nuvarande skada: hur många pass har fel timmar, vilka har 0 kr, vilka är dubbletter.
2. Migrera bort `profiles.hourly_rate/tax_rate/ob_rules` — all lön läses ENBART från `work_profiles` (One Source of Truth).
3. Alla queries på `shifts` filtrerar `deleted_at IS NULL` (grep + fix).
4. Låsa `computeShiftAmounts` som ENDA beräkningsvägen. Ta bort ev. parallell logik i UI.
5. Rapport: "X pass fixade, Y fel kvar, orsaker: …". Ingen ny UI förrän detta stämmer.

### STEG 2 — Work Engine (datamodell)
Migration som lägger till:
- `workplaces` (egna objekt, flera per profil, egna adresser, restid)
- `work_profiles` utökas: `pay_period_start_day`, `payday_day`, `payday_offset_months`, `employer`, `role`, `vacation_pay_percent`
- `shifts` utökas: `workplace_id`, `shift_category` (ordinary/extra/overtime/on_call_waking/on_call_sleeping/standby/inbeordrad), `import_batch_id`, `source`, `status`, `crosses_midnight` (generated), `end_date`
- `ob_rules` blir egen tabell (inte JSON), med `applies_to_category` så extra-pass kan ha egna regler
- `break_rules` egen tabell (regelbaserat rastavdrag)
- `holidays` (röda dagar, importeras) — påverkar OB
- RLS + GRANTs på allt

### STEG 3 — Salary Engine (en motor, alla vyer läser den)
- Flytta all beräkning till `src/modules/salary/engine.ts` — enda export: `computeShift(input): PaySnapshot`
- Motorn hanterar: vanligt, extra (egen sats/OB), vaken jour, sovande jour + utryckning, beredskap + utryckning, övertid, midnattspass, rast, helgdags-OB
- Alla pass sparar oföränderlig `pay_snapshot` (engine_version, breakdown, rules_applied)
- Recompute-verktyg med logg (`pay_recompute_log`) och skydd mot att röra låsta löneperioder
- Ta bort ALL kod som räknar lön någon annanstans (UI, importera.tsx, dashboard.tsx). Grep-verifierad.

### STEG 4 — Import Engine (gemensam scanner)
- `documents` (originalfil, hash, mime, sidor) — original ändras aldrig
- `import_batches` (klassificering, confidence, status, kan ångras)
- Klassificerare: schema / lönespec / kvitto / dokument (regelbaserad först, AI som fallback — men det kostar credits så vi frågar dig innan vi slår på)
- Fingerprint per rad (`{user_id, date, from, to, workplace_id}` hash) → dubbletter kan aldrig skapas
- Merge-läge: hittar befintligt pass med samma fingerprint → uppdaterar saknade fält istället för att skapa nytt
- Import-historik + ångra-import (soft delete hela batchen)
- Reparationsläge: kör om klassificering/parse på gammal batch utan att röra manuellt ändrade rader

### STEG 5 — Kalender (dag/vecka/månad/kvartal/halvår/år)
Läser från Salary Engine. Varje nivå visar: pass, timmar, raster, OB, övertid, jour, lön, ledighet, röda dagar, prognos.

### STEG 6 — Expense Engine (komplett ombyggnad)
Datamodell:
- `categories` + `subcategories` (system + användarens egna)
- `tags` (many-to-many)
- `accounts` (flera konton)
- `payment_methods`
- `transactions` (ersätter `expenses`) — direction (in/out), status, currency, fx_rate, amount_sek
- `recurring_transactions` (schemalägger)
- Relationer: `linked_to_type` + `linked_to_id` (fordon/fastighet/projekt/resa/företag/arbete/familj/försäkring/tillgång — tabellerna byggs när modulen kommer)
- Dokumentkoppling via `documents` (kvitto, OCR)

Sen UI: snabb-inmatning, favoriter, mallar, dubblettkontroll, översikt (dag/vecka/månad/kvartal/år/eget intervall), budget per kategori/konto/projekt/mål med varningar.

### STEG 7 — Ny Home / kontrollcenter
Byggs SIST, när alla motorer levererar verklig data. Inte förr.

## Vad jag INTE gör i denna plan
- Ingen ny knapp, widget eller sida ovanpå nuvarande buggar
- Ingen AI som fattar beslut — bara förslag som du godkänner
- Ingen betald AI-anrop utan att fråga dig först (import-klassificerare kan börja regelbaserad)
- Rör inte 4ThePeople/Glow Up (finns inte i projektet, bekräftat)

## Vad jag behöver från dig nu
Bara "kör steg 1" så börjar jag med diagnos + städ. Efter varje steg rapporterar jag "Klart: … / Kvar: …" och väntar på ditt godkännande innan nästa steg.

Om du vill ändra ordningen eller lägga till/ta bort något — säg det nu, innan jag börjar.