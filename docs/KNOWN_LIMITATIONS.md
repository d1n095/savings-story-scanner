# KNOWN_LIMITATIONS — teknisk skuld och begränsningar (Version 12)

Ingen skuld är utelämnad för att rapporten ska se bättre ut. Inget har städats undan i denna
körning; listan beskriver läget som det är.

## 1. Duplicerad kod utanför `src/`
Repo-roten innehåller ca 1 220 rader parallella implementationer (`session.ts`, `db.ts`,
`events.ts`, `shift-service.ts`, `finance-service.ts`, `classify.ts`, `import-router.ts`,
`ocr-client.ts`, `datetime.ts`, `format.ts`, `i18n-format.ts`, `ob.FIXED.ts`) samt elva
`*.CHANGED.tsx`-kopior. Ingen importeras av bygget. Följd: oklart vilken kod som är sanningen.

## 2. Spec och databas divergerar
`UPGRADE_02…08_*.sql` och `lager1_schema.sql` beskriver `owner_contexts`, `context_members`,
`pay_lines`, `pay_rules`, `documents`, `import_batches`. Ingen av dessa finns i databasen
eller i genererade typer. ADR-002/003/006 är därmed **beslutade men ogenomförda**.

## 3. Testluckor
113 tester finns, men täcker nästan bara plattformslagret, modultjänsten, planering, träning
och OB-midnatt. Ingen täckning för:
- `src/modules/main-ai/**` (0 tester)
- `src/lib/schedule-ocr.functions.ts` (0 tester)
- `src/modules/training/service.ts` frågelager
- korsanvändar-RLS (två samtidiga användare kunde inte testas i miljön)
- route-komponenter (inga komponenttester alls; ingen jsdom-miljö konfigurerad)

## 4. Typsäkerhet
`AGENTS.md` förbjuder `any`, men `main-ai-service.functions.ts` använder `supabase: any` och
`schedule-ocr.functions.ts` använder `json: any`. `npx tsc -b --noEmit` går ändå igenom.

## 5. Modulisolering är konvention
Moduler körs i samma bundle. Behörigheter kontrolleras bara om modulen frivilligt går via
`module-runtime`. Inget eslint-regelverk hindrar att en modul importerar en annan moduls
interna filer eller en route. `isolation.test.ts` skyddar endast plattformslagret och
använder en manuellt underhållen tillåtelselista.

## 6. Arkitekturskuld i UI
33 filer anropar Supabase-klienten direkt; affärslogik ligger delvis i route-filer.
Största filer: `PlanningView.tsx` 1067, `installningar.lon-arbete.tsx` 974, `jobb.tsx` 733,
`kalender.tsx` 665, `main-ai.tsx` 583, `importera.tsx` 509 rader.

## 7. AI-kostnadsyta
Två betalda anrop finns trots regeln "inga betalda AI-anrop": schema-OCR (godkänt undantag,
ADR-010) och main-ai-prototypen via `GEMINI_API_KEY` (gratisnivå, men extern beroende).
Ingen av dem har rate limiting, kvot per användare eller storleksgräns på indata.

## 8. Robusthet
- Audit i main-ai är best-effort i `try/catch` → händelser kan tappas tyst.
- Ingen retry/backoff vid 429/5xx i något AI-anrop.
- `healthCheck()` i Gemini-adaptern returnerar alltid `ok: true` (falsk signal).
- Ingen kö: långa OCR-anrop sker synkront i requesten.

## 9. Historikpolicy låst i kod
Lönehistorik fryses via `verification_status` och snapshotfält (ADR-011) — korrekt, men
omräkning/avstämning (`pay_lines`) är inte byggd, så historiken kan inte förklaras radvis.

## 10. Miljöbegränsningar i denna granskning
- Publicering ej utförd (uttryckligen förbjudet).
- Inga hemligheter eller `.env` lästa eller ändrade.
- Ingen jämförelse mot riktig LifeAI-kod (inte ansluten).
- Ingen testdata skapad; `BENCHMARK_`-prefixet behövdes aldrig eftersom granskningen var
  läsande. Inga rader skrevs till databasen.
