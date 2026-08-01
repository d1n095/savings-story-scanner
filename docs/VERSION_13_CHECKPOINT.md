# Version 13 — Checkpoint & bevisverifiering

**Datum:** 2026-08-01 · **Typ:** enbart verifiering · **Nya funktioner:** 0 · **Refaktoreringar:** 0
**Publicerad:** nej · **Hemligheter ändrade:** nej · **Produktionslik data ändrad:** nej

Bevismärkning som används genomgående:
`CODE_VERIFIED` (läst i kod) · `TEST_VERIFIED` (bevisat av testkörning) ·
`UI_VERIFIED` (sett i webbläsare) · `DATABASE_VERIFIED` (frågat databasen) ·
`INFERENCE` (slutsats, inte bevis) · `NOT_VERIFIED` (ej kontrollerat) ·
`NOT_MEASURED` (mätning ej konfigurerad) · `NOT_APPLICABLE` (finns inte i detta repo).

---

## 1. Exakt versionsstatus

| Fakta | Värde | Bevis |
| --- | --- | --- |
| HEAD | `d8bf1d8` "Publicerade portabilitetsdokument" | CODE_VERIFIED (`git log -1`) |
| HEAD-föräldrar | `8360fd1` + `6b3788f` (merge-commit) | CODE_VERIFIED |
| Arbetsträd | **helt rent** — `git status --short` gav noll rader | CODE_VERIFIED |
| Ospårade filer | inga | CODE_VERIFIED |
| Osparade diffar | inga (`git diff --stat` tomt) | CODE_VERIFIED |

Rå output:

```
$ git status --short
(tom)

$ git diff --stat
(tom)

$ git diff -- .env
(tom)

$ git diff -- src supabase package.json
(tom)

$ git diff --stat -- docs
(tom)
```

Arbetsträdet är rent därför att plattformen committade föregående tur som
`d8bf1d8`. Ändringarna finns alltså i historiken, inte i arbetsträdet.
`git diff` mot HEAD är därför inte ett bevis på att inget ändrades — det korrekta
beviset är commit-diffen nedan.

---

## 2. Utredning: "`.env` changed, restarting server..."

**Slutsats: `.env`s innehåll ändrades inte. Endast filens mtime ändrades när
sandlådan omprovisionerades, och filbevakaren rapporterar mtime-ändring som
ändring.** Inget har återställts eller rättats — orsaken dokumenteras här först.

Bevis, i ordning:

1. `git diff --quiet HEAD -- .env` → **IDENTISK (0 byte-diff)** · CODE_VERIFIED
2. `.env` är spårad i git och senast innehållsändrad i commit `385fc23` — inte i
   `d8bf1d8` · CODE_VERIFIED
3. `git diff --stat HEAD^2 HEAD -- .env` → tom · CODE_VERIFIED
4. Filsystem: `.env mtime = 2026-08-01 08:19:16 UTC`, storlek 685 byte · CODE_VERIFIED
5. Vite-daemonen startade om **08:19:28**, tolv sekunder efter mtime-stämpeln:
   ```
   [stderr] error: script "dev" exited with code 143
   [stderr] $ vite dev --port "8080"
   [stdout]   VITE v8.0.16  ready in 3700 ms
   ```
   Exit 143 = SIGTERM, dvs. en styrd omstart utifrån, inte en krasch · CODE_VERIFIED
6. Samma tidsfönster uppgraderade plattformens byggverktyg — se commit-diffen:
   `@lovable.dev/vite-tanstack-config` 2.8.1 → 2.8.4 och
   `@lovable.dev/vite-plugin-hmr-gate` 1.2.1 → 1.3.3, med registerbyte
   `europe-west1` → `europe-west4` · CODE_VERIFIED

**Orsakskedja (INFERENCE, byggd på bevisen 1–6):** sandlådan materialiserade om
projektfilerna och uppgraderade Vite-plugin-paketen; `.env` skrevs om med
byte-identiskt innehåll, vilket satte ny mtime; Vites env-bevakare jämför mtime,
inte innehåll, och loggade därför "`.env` changed, restarting server".

**Korrigering av mitt tidigare påstående (viktigt):** jag skrev i förra turen
"inga ändrade filer". Det var **fel**. Commit `d8bf1d8` innehåller tre
filändringar utöver mina fem dokument:

| Fil | Ändring | Vem | Bevis |
| --- | --- | --- | --- |
| `package.json` | `@lovable.dev/vite-tanstack-config` 2.8.1 → 2.8.4 | plattformen | CODE_VERIFIED |
| `bun.lock` | samma + `vite-plugin-hmr-gate` 1.2.1 → 1.3.3, nytt registerdomän | plattformen | CODE_VERIFIED |
| `src/routeTree.gen.ts` | +10 rader: `declare module '@tanstack/react-start'` Register-block | routergeneratorn | CODE_VERIFIED |

Ingen av dessa är skriven av mig, och ingen rör affärslogik. `src/routeTree.gen.ts`
är genererad och får inte redigeras manuellt.
`git diff HEAD^1 HEAD -- supabase` → tom: **inga schemaändringar** · CODE_VERIFIED

---

## 3. Skapade och modifierade filer

**Skapade i föregående tur (5 dokument, inga kodändringar):**

| Fil | Rader | Bevis |
| --- | --- | --- |
| `docs/MAINAI_ARCHITECTURE.md` | 183 | CODE_VERIFIED |
| `docs/MAINAI_PORTABILITY_REPORT.md` | 198 | CODE_VERIFIED |
| `docs/KNOWN_LIMITATIONS.md` | 61 | CODE_VERIFIED |
| `docs/AGENT_WORK_LOG.md` | 100 | CODE_VERIFIED |
| `docs/mainai-portability-manifest.json` | 381 | CODE_VERIFIED |

**Modifierade av plattformen, inte av mig:** `package.json`, `bun.lock`,
`src/routeTree.gen.ts` (se avsnitt 2).

**Skapade denna tur:** endast denna fil, `docs/VERSION_13_CHECKPOINT.md`.
**Ändrade denna tur:** inga. `git status --short` efter tsc + vitest + build gav
noll rader · CODE_VERIFIED

---

## 4. Migrations- och databasstatus

| Fakta | Värde | Bevis |
| --- | --- | --- |
| Migrationsfiler | 15 i `supabase/migrations/` | CODE_VERIFIED |
| Publika tabeller | 29 | DATABASE_VERIFIED |
| Tabeller utan RLS-policy | 0 | DATABASE_VERIFIED |
| Edge functions | 0 (`supabase/functions` finns inte) | CODE_VERIFIED |
| Schemadiff i denna checkpoint | ingen | CODE_VERIFIED |
| Rot-SQL `UPGRADE_02…08`, `lager1_schema.sql` | **ej applicerad** | DATABASE_VERIFIED |
| Saknade spec-tabeller | `owner_contexts`, `context_members`, `pay_lines`, `pay_rules`, `documents`, `import_batches` | DATABASE_VERIFIED |
| `ai_memory` | finns i databasen, används av **noll** kodrader | DATABASE_VERIFIED + CODE_VERIFIED |

---

## 5. Verifierade funktioner

| Område | Status | Bevis |
| --- | --- | --- |
| Typkontroll | `npx tsc -b --noEmit` → exit 0 | CODE_VERIFIED |
| Testsvit | 9 filer, 113 tester, 0 fel | TEST_VERIFIED |
| Produktionsbygge | `npm run build` → `✓ built`, exit 0, nitro-artefakter genererade | CODE_VERIFIED |
| Plattformsisolering | `isolation.test.ts`, 4 tester grönt | TEST_VERIFIED |
| Modullivscykel | `module-state.test.ts` 26 + `module-system.test.ts` 19 grönt | TEST_VERIFIED |
| Modultjänst mot DB | `module-service.test.ts` 10 grönt | TEST_VERIFIED |
| Träning → kalender | `calendar-integration.test.ts` 11 grönt | TEST_VERIFIED |
| Träning enable/disable i UI | verifierat i tidigare tur | UI_VERIFIED |
| OB över midnatt | `ob-midnight.test.mjs` 8 grönt | TEST_VERIFIED |
| MainAI-chattflöde mot Gemini | **NOT_VERIFIED** — noll tester, ej körd denna tur | NOT_VERIFIED |
| Schema-OCR | **NOT_VERIFIED** — noll tester, ej körd denna tur | NOT_VERIFIED |
| Korsanvändar-RLS-isolering (verklig andra användare) | **NOT_VERIFIED** | NOT_VERIFIED |

---

## 6. Korrigerad testinformation

Formuleringen "30 % testtäckning" är borttagen som ogiltig. Andelen moduler med
testfil är **inte** täckningsgrad. Korrekt redovisning, separerad:

| Mätvärde | Värde | Bevis |
| --- | --- | --- |
| Moduler i `src/modules/` | 6 (`calendar`, `finance`, `main-ai`, `planning`, `salary`, `training`) | CODE_VERIFIED |
| Moduler med egna tester | 2 (`planning`, `training`) | CODE_VERIFIED |
| Moduler utan tester | 4 (`calendar`, `finance`, `main-ai`, `salary`) | CODE_VERIFIED |
| Testfiler totalt | 9 (8 under `src/`, 1 i roten: `ob-midnight.test.mjs`) | TEST_VERIFIED |
| Tester totalt | 113, alla passerade | TEST_VERIFIED |
| Line coverage | **NOT_MEASURED** | se nedan |
| Branch coverage | **NOT_MEASURED** | se nedan |
| Function coverage | **NOT_MEASURED** | se nedan |

Skäl till NOT_MEASURED: `node_modules/@vitest/coverage-v8` saknas och inget
coverage-block finns i vitest-konfigurationen · CODE_VERIFIED. Inga paket har
installerats för att mäta detta, enligt instruktion.

---

## 7. Korrigerade klassificeringar

### 7.1 `memory.ts` och `run-code` — NOT_APPLICABLE i detta repo

Sökning efter `memory.ts`, `run-code`, `runCode` och `new Function(` i `src/` och
repo-roten gav **noll träffar** · CODE_VERIFIED.

Följaktligen:

- Det finns **ingen** `memory.ts` som klassats PORTA DIREKT. Den frågan gäller ett
  annat kodbas (LifeAI-repot), inte LifeApp.
- Det finns **ingen** `run-code`-implementation, ingen `new Function()`, ingen
  sandbox och ingen timeout — alltså finns inget att avklassa. LifeApp saknar
  kodexekvering helt.
- Regeln gäller ändå framåt och skrivs in här som bindande: en fingerprint som
  bygger på textprefix får aldrig märkas PORTA DIREKT, och `new Function()` utan
  isolerad sandbox, minnestak och timeout får aldrig beskrivas som återanvändbar
  implementation — den märks KASSERA.

Närmaste faktiska motsvarigheter i LifeApp, korrekt klassade:

| Faktisk fil | Vad den gör | Klassning |
| --- | --- | --- |
| `ai_memory`-tabellen (ingen kod) | avsedd minnesyta, noll läs-/skrivväg | **KASSERA** — ingen implementation att porta |
| `src/lib/defaults.ts` + `user_defaults` | enkel key/value, ingen dedupe, ingen godkännandegrind | **ENDAST IDÉN** |
| `src/lib/schedule-ocr.functions.ts` (dedupe-fingerprint på pass) | nyckel av profil+datum+tid, `json: any`, ingen MIME/storleksvalidering | **PORTA EFTER HÄRDNING** |

### 7.2 Skärpt regel: porta kod ≠ återanvända idé

Fyra nivåer, nu med explicit skillnad:

- **PORTA DIREKT** — filen flyttas i stort sett oförändrad. Kräver: noll externa
  kopplingar, testtäckning, inga `any`, ingen ohärdad indata.
- **PORTA EFTER HÄRDNING** — koden flyttas, men först efter namngivna åtgärder.
- **ENDAST IDÉN** — **koden flyttas inte.** Endast designen/kravet återanvänds och
  implementationen skrivs från noll.
- **KASSERA** — implementationen är sämre eller farligare att reparera än att
  skriva om. Ingen kod och ingen design bärs över utan nytt beslut.

### 7.3 Omklassningar mot föregående rapport

| Post | Tidigare | Nu | Skäl |
| --- | --- | --- | --- |
| `platform.module-system` | PORTA DIREKT | **PORTA EFTER HÄRDNING** | in-memory persistens och rådgivande, otvingade permissions är inte produktionsklart · CODE_VERIFIED |
| `salary.engine` | PORTA DIREKT | **PORTA EFTER HÄRDNING** | konkurrerande `ob.FIXED.ts` i roten och noll tester för jour/beredskapssatser · CODE_VERIFIED |
| `ai_memory` | KASSERA (tabell) | **KASSERA** (oförändrat, skäl skärpt) | noll kodrader rör tabellen · DATABASE_VERIFIED |
| `debt.root-duplicates` | KASSERA | **KASSERA** (oförändrat) | ~1 220 rader utan sanningskälla, noll importer från `src/` · CODE_VERIFIED |

Oförändrat PORTA DIREKT, med exakta filvägar och kodområden:

| Post | Filvägar | Funktioner/kodområden | Bevis |
| --- | --- | --- | --- |
| Plattformskontrakt | `src/platform/contracts.ts`, `commands.ts`, `events.ts` | `contractVersion`, kommandokuvert, händelsekuvert, dedupe-nyckel | TEST_VERIFIED (`platform-contracts.test.ts`, 13 tester) |
| Lokal adapter | `src/platform/adapter.ts` | `dispatch` → `not_implemented`, in-memory kö + dedupe-set | TEST_VERIFIED (`isolation.test.ts`, 4 tester) |
| Kalenderleverantörskontrakt | `src/platform/calendar-provider.ts`, `src/modules/calendar-providers.ts`, `src/modules/training/calendar.ts`, `src/hooks/use-calendar-contributions.ts` | `CalendarProvider`, `CalendarContribution`, registerfiltrering på aktiverade moduler | TEST_VERIFIED (11 tester) + UI_VERIFIED |
| Kalenderns rena kärna | `src/modules/calendar/source.ts`, `holidays.ts`, `namedays.ts` | `buildDayIndex`, svenska helg- och namnsdagar | CODE_VERIFIED (delvis TEST_VERIFIED) |

---

## 8. Kända risker och fel

| # | Risk | Allvar | Bevis |
| --- | --- | --- | --- |
| R1 | Hydreringsfel på `/idag`: servern renderade "God morgon", klienten "God förmiddag" — tidsberoende hälsning beräknas på båda sidor | medel | UI_VERIFIED (runtime-fel i förhandsvisningen) |
| R2 | `src/modules/main-ai/main-ai-service.functions.ts`: `supabase: any`, audit i best-effort `try/catch`, ingen rate limiting, noll tester | hög | CODE_VERIFIED |
| R3 | `src/lib/schedule-ocr.functions.ts`: `json: any`, ingen storleks-/MIME-validering av data-URL, ingen retry, originalet sparas aldrig, noll tester | hög | CODE_VERIFIED |
| R4 | ~1 220 rader parallellkod i repo-roten (`shift-service.ts`, `session.ts`, `db.ts`, `events.ts`, `ob.FIXED.ts`, `*.CHANGED.tsx`) — ingen sanningskälla, risk för felaktig återinförsel | hög | CODE_VERIFIED |
| R5 | Rot-SQL beskriver tabeller som inte finns i databasen — specen ser genomförd ut men är det inte | medel | DATABASE_VERIFIED |
| R6 | Coverage är omätt; 113 grönt säger inget om hur mycket kod som körs | medel | NOT_MEASURED |
| R7 | `PlanningView.tsx` 1 067 rader, `kalender.tsx` 665 rader, `training/service.ts` 682 rader — affärslogik i UI-lagret | medel | CODE_VERIFIED |
| R8 | Modulgränser är konvention: inget lint-skydd hindrar modul→route- eller modul→modul-import | medel | CODE_VERIFIED |
| R9 | Korsanvändar-RLS aldrig verifierad med en verklig andra användare | hög | NOT_VERIFIED |

R1 är känd och **inte åtgärdad i denna tur**, eftersom instruktionen förbjuder
kodändringar. Den är loggad för nästa kodtur.

---

## 9. Vad som senare ska jämföras med LifeAI

| Område i LifeApp | Jämförelsepunkt i LifeAI |
| --- | --- |
| `src/platform/contracts.ts`, `commands.ts`, `events.ts` | kommandokuvert, händelsekuvert, `contractVersion`, dedupe |
| `src/platform/module-sdk.ts`, `module-registry.ts`, `module-state.ts`, `module-runtime.ts` | manifestformat, semver-kompatibilitet, livscykel, permission-grind |
| `src/platform/adapter.ts` | transportgräns LifeApp ↔ LifeOS |
| `src/platform/calendar-provider.ts` | leverantörsmönster för modulbidrag till delade vyer |
| `src/modules/main-ai/*` | verklig agentloop kontra ett modellanrop per meddelande |
| `src/modules/main-ai/providers/gemini-provider.ts` | providerabstraktion, streaming, retry, kostnadsbudget |
| `ADR-006-document-engine.md` | den generella dokumentmotorn (9 steg) |
| `AGENTS.md` + `docs/DEFINITION_OF_DONE.md` | maskinkontrollerad efterlevnad i stället för text |

Frånvarande i LifeApp och därför utan jämförelsebas: agentplanering/verktygsloop,
promptbibliotek med versionering, kodexekveringssandbox, sökning (varken fulltext
eller semantisk), File-to-Memory, minnesförslag med godkännande och dedupe,
importbatch med ångra · CODE_VERIFIED.

---

## 10. Får absolut inte kopieras utan härdning

| Fil / område | Krav före kopiering |
| --- | --- |
| `src/lib/schedule-ocr.functions.ts` | typa svaret (bort med `any`), validera MIME + storlek på data-URL, retry på 429/5xx, spara originalet, kör asynkront i kö, batch + ångra, tester |
| `src/modules/main-ai/main-ai-service.functions.ts` | typad Supabase-klient, obligatorisk audit (inte best-effort), rate limiting, paginering, dela upp per ansvar, tester |
| `src/modules/main-ai/providers/gemini-provider.ts` | verklig healthcheck, retry/backoff, streaming, kostnadstak, ingen läckage av leverantörssvar |
| `src/services/module-service.ts` | transaktionell installation, DB-constraint på `granted_permissions` |
| `src/platform/module-*.ts` | persistent tillstånd, verklig modulisolering, tvingande importgräns, test för cirkulära beroenden |
| `src/modules/salary/*` | daterad regelversionering (`valid_from`), tester för jour/beredskap, ta bort `ob.FIXED.ts` |
| Alla rotfiler och `*.CHANGED.tsx` | **kopieras inte alls** — KASSERA |
| Genererade filer (`src/integrations/supabase/*`, `src/routeTree.gen.ts`, `src/server.ts`, `src/start.ts`) | ersätts av målarkitekturens motsvarigheter, kopieras inte |

---

## 11. SHA-256 för de fem benchmark-filerna

```
9ca7ea77b67239cf3c0df4728e803e33b0fc8695d28b9e3a23183214b8379296  docs/MAINAI_ARCHITECTURE.md
cc4827d046ec4334ab7447c9b5bb664f6b8955be48e1b2fbe248487ba2925377  docs/MAINAI_PORTABILITY_REPORT.md
e79c6d5aee34bb5dbf022d5d69ee1588d3481e21663cad5951fd7ccf0cc7df35  docs/KNOWN_LIMITATIONS.md
1573a9336b71470c3165e1d692cbd3a8030b66f1a21cf8b5e61992cd1fe05f62  docs/AGENT_WORK_LOG.md
05996af317066083f2e2eeb030024d510a1823ade83dda30f633fe355f3e0659  docs/mainai-portability-manifest.json
```

Beräknade med `sha256sum` 2026-08-01 · CODE_VERIFIED.

---

## 12. Slutkörning — rå output

```
$ npx tsc -b --noEmit
tsc exit=0

$ npx vitest run
 ✓ src/platform/__tests__/isolation.test.ts (4 tests) 33ms
 ✓ ob-midnight.test.mjs (8 tests) 7ms
 ✓ src/modules/training/__tests__/module.test.ts (13 tests) 96ms
 ✓ src/platform/__tests__/module-system.test.ts (19 tests) 53ms
 ✓ src/services/__tests__/module-service.test.ts (10 tests) 38ms
 ✓ src/platform/__tests__/platform-contracts.test.ts (13 tests) 17ms
 ✓ src/platform/__tests__/module-state.test.ts (26 tests) 60ms
 ✓ src/modules/planning/__tests__/module.test.ts (9 tests) 17ms
 ✓ src/modules/training/__tests__/calendar-integration.test.ts (11 tests) 29ms
 Test Files  9 passed (9)
      Tests  113 passed (113)
   Duration  5.32s

$ npm run build
✓ built in 1.48s
[nitro] ℹ Using auto generated worker name: tanstack-start-ts
ℹ Generated dist/server/wrangler.json
ℹ Generated .wrangler/deploy/config.json
ℹ Generated dist/client/_headers
ℹ Generated dist/nitro.json
build exit=0

$ git status --short
(tom)
```

**Filer ändrade under denna körning:** inga. `tsc`, `vitest` och `build` skrev
endast till `dist/`, `.wrangler/` och `node_modules/.vite` — inga spårade filer
berördes, vilket bekräftas av att `git status --short` är tom efteråt ·
CODE_VERIFIED.

**Filer skapade under denna körning:** endast `docs/VERSION_13_CHECKPOINT.md`.
