# Architecture Decision Log

**Styrande:** [/AGENTS.md](../AGENTS.md)

Ett accepterat beslut vänds aldrig tyst. Ändring sker genom ett nytt beslut som
uttryckligen ersätter (`Supersedes`) det gamla.

Format: `ADR-xxx | Datum | Status: Accepted | Superseded by ADR-yyy | Rejected`

## Tidigare beslut (rotfiler, behålls som källa)

`ADR-001-salary-architecture.md`, `ADR-002-ownership-tenancy.md`,
`ADR-003-financial-model.md`, `ADR-004-internationalization.md`,
`ADR-005-event-system.md`, `ADR-006-document-engine.md` ligger i repo-roten och
gäller fortfarande. Nya beslut skrivs här.

---

## ADR-007 — Trelagersmodell LifeOS / LifeAI / LifeApp
**Datum:** 2026-07-30 · **Status:** Accepted
LifeApp är kroppen. LifeAI orkestrerar men verkställer aldrig. LifeOS auktoriserar.
Detta repo bygger ingen egen agentkärna.
**Konsekvens:** `/main-ai` fryses som prototyp; kontrakten i `src/platform/` är gränssnittet.
**Se:** [LIFEAPP_ARCHITECTURE.md](LIFEAPP_ARCHITECTURE.md)

## ADR-008 — Plattformslagret är inert i Fas I
**Datum:** 2026-07-30 · **Status:** Accepted
`src/platform/**` innehåller enbart typer, ren logik och en lokal in-memory-adapter.
Inga nätverksanrop, inga nycklar, inga ändringar i befintliga flöden.
**Konsekvens:** Isolationstest bevakar att lagret inte importerar affärslogik eller Supabase.

## ADR-009 — Modulär plugin-arkitektur med Life Store
**Datum:** 2026-07-30 · **Status:** Accepted
Varje domän blir en installerbar förstapartsmodul bakom Life Module Runtime.
Migrering sker en modul i taget, additivt.
**Se:** [MODULE_STANDARD.md](MODULE_STANDARD.md), [LIFEAPP_MODULE_SYSTEM.md](LIFEAPP_MODULE_SYSTEM.md)

## ADR-010 — Inga betalda AI-anrop, med ett undantag
**Datum:** 2026-07-30 · **Status:** Accepted
All "AI" i LifeApp är deterministisk och lokal. Enda godkända undantaget är
schema-OCR i `src/lib/schedule-ocr.functions.ts`.
**Konsekvens:** Nya modeller, leverantörer eller nycklar kräver uttryckligt godkännande.

## ADR-011 — Historiska pass räknas inte om automatiskt
**Datum:** 2026-07-30 · **Status:** Accepted
Befintliga pass behåller sina sparade belopp. Nya regler gäller framåt och via
uttrycklig avstämning, aldrig genom tyst massuppdatering.
**Konsekvens:** `verification_status` och snapshot-fält på `shifts` skyddar historiken.

## ADR-012 — AGENTS.md är projektets styrande protokoll
**Datum:** 2026-07-30 · **Status:** Accepted
Rotplacerad `/AGENTS.md` gäller före andra instruktioner, och pekar på blueprint,
modulstandard, Definition of Done, current state, beslutslogg och kravmatris.
**Konsekvens:** Nya arkitekturdokument skapas inte; befintliga uppdateras.

## ADR-013 — Modulmanifest bor i modulen, katalogen i modullagret
**Datum:** 2026-07-30 · **Status:** Accepted
Planering är den första riktiga Life Module: manifestet ligger i
`src/modules/planning/module.ts` och Life Store-katalogen sätts samman i
`src/modules/catalog.ts`. Beroendet går alltid moduler → plattform.
**Konsekvens:** `src/platform/module-catalog.ts` behåller endast ännu icke-flyttade
kärnmanifest (`corePreinstalledModules`) plus `upcomingModules`. Route-filer under
`src/routes/_app/` är tunna adaptrar utan affärslogik.
**Se:** [MODULE_STANDARD.md](MODULE_STANDARD.md), `src/modules/planning/README.md`


## ADR-015 — Kalendern läser moduldata via leverantörskontrakt
**Datum:** 2026-07-30 · **Status:** Accepted
Kalendern frågar aldrig en modults tabeller. Plattformen definierar
`CalendarProvider`/`CalendarContribution` (`src/platform/calendar-provider.ts`).
Varje modul äger sin egen adapter (`src/modules/<modul>/calendar.ts`) och skalet
registrerar leverantörerna i `src/modules/calendar-providers.ts`. Registret filtrerar
på aktiverade moduler, så bidrag försvinner när modulen inaktiveras eller avinstalleras.
**Konsekvens:** Nya moduler syns i kalendern utan att kalendermodulen ändras.
**Se:** `src/modules/training/calendar.ts`, `src/hooks/use-calendar-contributions.ts`
