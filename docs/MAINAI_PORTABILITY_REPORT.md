# MAINAI_PORTABILITY_REPORT — återanvändbarhet mot en större MainAI-arkitektur

**Status:** experiment/arbetsprov. Projektet publiceras inte. Ingen jämförelse görs mot
den riktiga LifeAI-koden — den är inte ansluten till detta repo och inga skillnader har
uppfunnits. Underlaget är avsett för senare maskinell jämförelse
(`docs/mainai-portability-manifest.json`).

Klassificering: **PORTA DIREKT** · **PORTA EFTER HÄRDNING** · **TA ENDAST IDÉN** · **KASSERA**.

Sammanfattning: 4 moduler porta direkt, 6 efter härdning, 5 endast idén, 4 kasseras.

---

## PORTA DIREKT

### P1. Plattformskontrakt
`src/platform/contracts.ts`, `commands.ts`, `events.ts`
Gör: definierar `AppManifest`, capabilities, permissions, kommando- och händelsekuvert med
`contractVersion` och dedupe-nyckel.
**Styrkor:** ren TS, noll beroenden, versionerade kontrakt, testade (`platform-contracts.test.ts`).
**Svagheter:** ingen runtime-schemavalidering (Zod) av inkommande kuvert från nätverk.
**Säkerhet:** ingen egen risk; men kuvert saknar signatur/avsändarverifiering.
**Prestanda/skalbarhet:** ej relevant (typer + rena funktioner).
**Testluckor:** inga negativa fuzz-tester på malformerade kuvert.
**Plattformslåsning:** ingen.
**Före användning:** lägg till Zod-parsers vid nätverksgränsen och en `actor`/signaturfält.

### P2. Modul-SDK och modulregister
`src/platform/module-sdk.ts`, `module-registry.ts`, `module-state.ts`, `module-runtime.ts`
Gör: manifestformat, semver/caret-kompatibilitet, install/enable/disable/uninstall/update/
rollback med typade felkoder, permission-grind i runtime.
**Styrkor:** helt ren logik utan DB/UI, persistens är utbytbar bakom samma gränssnitt,
54 tester täcker livscykel och tillstånd.
**Svagheter:** register är in-memory; beroendegraf hanterar bara direkta beroenden;
ingen sandbox — "modul" är vanlig import i samma bundle.
**Säkerhet:** permissions är rådgivande i praktiken; en modul kan importera vad som helst
(inget lint-tvång), så grinden gäller bara den som frivilligt går via runtime.
**Skalbarhet:** `activeRoutes()` och `list()` är O(n) – oproblematiskt.
**Testluckor:** inga tester för cirkulära beroenden eller samtidiga uppdateringar.
**Plattformslåsning:** ingen.
**Före användning:** verklig isolering (separat bundle/worker per modul) + tvingande
importgräns i lint, annars är permissionmodellen kosmetisk.

### P3. Lönemotor
`src/modules/salary/compute.ts`, `ob.ts`, `breaks.ts`, `templates.ts`, `conflicts.ts`, `parser.ts`
Gör: bas-, OB-, rast-, midnatts-, jour- och beredskapsberäkning.
**Styrkor:** ren TS, domänvärde som är dyrt att bygga om, midnattsfall täckta av
`ob-midnight.test.mjs` (8 tester).
**Svagheter:** ingen temporal regelversionering i kod (regler antas gälla "nu");
`ob.FIXED.ts` i repo-roten är en konkurrerande variant.
**Säkerhet:** ingen.
**Testluckor:** ingen täckning för beredskap/jour-satser eller kollektivavtalsvarianter.
**Före användning:** inför daterade regelversioner (`valid_from`) och flytta bort dubbletten.

### P4. Kalenderleverantörskontrakt
`src/platform/calendar-provider.ts`, `src/modules/calendar-providers.ts`,
`src/modules/training/calendar.ts`, `src/hooks/use-calendar-contributions.ts`
Gör: moduler bidrar med kalenderposter utan att kalendern känner deras tabeller; register
filtrerar på aktiverade moduler och isolerar fel per leverantör.
**Styrkor:** korrekt beroendeinvertering, verifierat i webbläsare (bidrag försvinner när
modul inaktiveras), 11 tester.
**Svagheter:** varje leverantör hämtar egen data → N nätverksanrop per vy;
ingen tidsfönster-parameter i kontraktet på DB-nivå.
**Prestanda:** N+1-mönster växer linjärt med antal moduler.
**Före användning:** batcha hämtning och skicka intervall ner i frågan.

---

## PORTA EFTER HÄRDNING

### H1. MainAI-datamodell och serverfunktioner
`src/modules/main-ai/main-ai-service.functions.ts` (515 rader), tabeller `main_ai_*`
Gör: konversationer, meddelanden, tasks, approvals, audit — auth-skyddat med explicit
ägarkontroll utöver RLS.
**Styrkor:** dubbelt ägarskapsförsvar, historikgräns (30 msg / 8 000 tecken), audit-tabell.
**Svagheter:** `supabase: any` i hjälpfunktioner (otypat), audit sväljer fel tyst,
en enda fil med alla ansvar, ingen paginering utöver `limit(100)`.
**Säkerhet:** audit kan tappas utan spår; ingen rate limiting per användare.
**Skalbarhet:** meddelandehistorik läses i sin helhet per svar.
**Testluckor:** **noll** tester på hela main-ai-ytan.
**Låsning:** `createServerFn` + Supabase-middleware.
**Före användning:** typa klienten, gör audit obligatorisk (transaktion eller kö),
dela upp per ansvar, lägg till rate limiting och tester.

### H2. Gemini-provideradapter
`src/modules/main-ai/providers/gemini-provider.ts`, `provider.ts`
**Styrkor:** dependency-free REST, 30 s timeout, statusmappning, läcker aldrig nyckel eller
providersvar, provider aktiveras bara när nyckeln finns (ingen fejkad fallback).
**Svagheter:** ingen streaming, ingen retry/backoff, ingen tokenbudget (`estimateUsage()`
returnerar `{}`), `healthCheck()` returnerar alltid `ok` — falsk signal.
**Före användning:** riktig healthcheck, retry på 429/5xx, streaming, kostnadsbudget.

### H3. Schema-OCR
`src/lib/schedule-ocr.functions.ts`, `src/routes/_app/importera.tsx`
**Styrkor:** strikt `json_schema`, svensk prompt, per-rad-confidence från modellen,
regexfiltrering, tydliga fel för 402/429.
**Svagheter:** `json: any`; ingen retry; ingen storleksgräns på data-URL; bilden skickas
som base64 i request-body (minnesspik); originalet sparas inte; ingen klassificering.
**Säkerhet:** en användare kan skicka mycket stora bilder → kostnads-/DoS-yta mot AI-gateway.
**Skalbarhet:** synkront anrop i request-cykeln, ingen kö.
**Testluckor:** inga tester (varken parser eller flöde).
**Låsning:** `ai.gateway.lovable.dev` + `LOVABLE_API_KEY`.
**Före användning:** storleks-/MIME-validering, retry, asynkron kö, spara original,
och den generella pipeline som ADR-006 beskriver.

### H4. Modultjänst mot databas
`src/services/module-service.ts` (327 rader), tabeller `module_installations`, `module_audit_events`
**Styrkor:** enda DB-vägen för modultillstånd, audit utan UPDATE/DELETE, 10 tester.
**Svagheter:** upsert-baserad (tidigare bugg i just detta mönster), inga transaktioner,
`granted_permissions` som textarray utan DB-validering.
**Före användning:** transaktionell installation + enum/constraint på permissions.

### H5. Träningsmodulen som modulmall
`src/modules/training/**`
**Styrkor:** komplett vertikal skiva (manifest → DB → RLS → service → UI → tester → kalender).
**Svagheter:** `service.ts` 682 rader; UI-komponenter innehåller viss affärslogik;
duplicerad `user_id` i barntabeller (denormalisering för RLS).
**Testluckor:** inga tester på `service.ts`-frågorna, inga korsanvändar-RLS-tester.
**Före användning:** dela upp service, testa frågelagret.

### H6. Kalenderkälla
`src/modules/calendar/source.ts` + `src/routes/_app/kalender.tsx` (665 rader)
**Styrkor:** ren `buildDayIndex`, svenska helg-/namnsdagar.
**Svagheter:** route-filen är stor och blandar hämtning, layout och navigation.
**Före användning:** flytta hämtning till hooks, behåll `source.ts` som ren kärna.

---

## TA ENDAST IDÉN

### I1. Rot-SQL som ogenomförd spec
`UPGRADE_01…08_*.sql`, `lager1_schema.sql`
Beskriver ägarskapskontexter, `pay_lines`/`pay_rules`, dokumentmotor och eventsystem.
**Ingen** av tabellerna finns i databasen. Värdet är designen, inte koden.

### I2. Dokumentmotor-pipeline
`ADR-006-document-engine.md`, plus oanvända `classify.ts`, `import-router.ts`, `ocr-client.ts`
9-stegspipeline (upload → classify → verify → extract → ghost-guard → dedupe → preview →
route → batch) är genomtänkt men **inte implementerad** och koden är inte inkopplad.

### I3. Spökpass- och dubblettskydd
Beskrivet i ADR-006 (content_hash + radmatchning). Bara enkel fingeravtrycksdedupe finns.

### I4. Life Store / tilläggsmarknad som UX
`src/routes/_app/tillagg.tsx` (387 rader) — bra modell för behörighetsdialog och livscykel,
men UI:t är projektspecifikt.

### I5. Styrsystemet
`AGENTS.md`, `docs/DEFINITION_OF_DONE.md`, `docs/MODULE_STANDARD.md`, ADR-loggen.
Processvärde, inte kod. Rekommenderas att kopieras som praxis.

---

## KASSERA

### K1. Rotfilsdubbletter
`session.ts`, `db.ts`, `events.ts`, `shift-service.ts`, `finance-service.ts`, `datetime.ts`,
`format.ts`, `i18n-format.ts`, `ob.FIXED.ts`, `classify.ts`, `import-router.ts`, `ocr-client.ts`
(≈1 220 rader). **Ingen fil under `src/` importerar dem** — verifierat med sökning.
Parallella implementationer utan sanningskälla. Ta inte med dem någonstans.

### K2. `*.CHANGED.tsx`-filer
`importera.CHANGED.tsx`, `jobb.CHANGED.tsx`, `kalender.CHANGED.tsx`, `pengar.CHANGED.tsx`,
`planering.CHANGED.tsx`, `root.CHANGED.tsx`, `shift-flow.CHANGED.tsx`,
`expense-flow.CHANGED.tsx`, `income-flow.CHANGED.tsx`, `installningar.import-historik.tsx`,
`session-context.tsx`. Ofärdiga patch-kopior utanför bygget.

### K3. `ai_memory`-tabellen som den ser ut
Finns i databasen, används av noll kodrader. Tomt skal — designa om från krav.

### K4. Genererade integrationsfiler
`src/integrations/supabase/*`, `src/routeTree.gen.ts`, `src/server.ts`, `src/start.ts`.
Plattformsspecifika och genererade — ska aldrig porteras, bara ersättas.

---

## Efterfrågade områden som **inte finns** i detta projekt

Ärlig redovisning — inget av detta har en implementation här `[KOD: sökning]`:

| Område | Läge |
| --- | --- |
| Agentplanering, stegkedjor, verktygsloop | Finns inte. Ett modellanrop per meddelande. |
| Promptbibliotek/versionerade prompts | Finns inte. Två inline-prompts (OCR, chatt). |
| JavaScript-/TypeScript-/Python-körning | Finns inte. Ingen sandbox; edge-runtimen tillåter inte subprocesser. |
| Sökning (fulltext/semantisk) | Finns inte. Ingen `tsvector`, ingen `pgvector`. |
| File-to-Memory | Finns inte. |
| Minnesförslag + godkännandeflöde | Finns inte. `user_defaults` är enkel key/value. |
| Batchhantering av dokument (`import_batches`) | Tabellen finns inte i databasen. |
| Edge functions | Inga. |

## Risknivåer (samlat)

- **Hög:** ingen testtäckning på main-ai och OCR · ingen storleksgräns på bilduppladdning ·
  permissionmodell utan verklig isolering · tyst audit-fel.
- **Medel:** direkt Supabase-åtkomst i 33 filer (svårt att byta backend) · stora route-filer
  (1067, 974, 733, 665 rader) · N+1 i kalenderleverantörer · `any` i serverfunktioner.
- **Låg:** rena logikmoduler, plattformslagret, kalenderkontraktet.
