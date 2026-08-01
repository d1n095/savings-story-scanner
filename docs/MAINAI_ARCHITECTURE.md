# MAINAI_ARCHITECTURE — faktisk arkitektur i detta repo (LifeApp, Version 12)

**Syfte:** teknisk kartläggning inför portabilitetsbedömning. Detta beskriver vad som
**finns i koden**, inte vad specifikationerna önskar. Inget publiceras, inget refaktoreras.

**Verifieringsnivåer** som används här: `[KOD]` läst i källfil · `[TEST]` bevisat av testsvit ·
`[DB]` läst från databasen · `[ANTAGANDE]`.

---

## 1. Stack och körmiljö `[KOD: package.json, vite.config.ts]`

| Del | Val |
| --- | --- |
| Ramverk | TanStack Start v1 (React 19, Vite 8) |
| Router | `@tanstack/react-router` + genererad `src/routeTree.gen.ts` |
| Serverlogik | `createServerFn` (ingen egen Node-process, edge-runtime) |
| Backend | Lovable Cloud (Supabase) — Postgres + Auth + RLS |
| Data-hämtning | `@tanstack/react-query` |
| UI | Tailwind v4 + shadcn/Radix |
| Test | Vitest (113 tester, 9 filer) `[TEST]` |
| Edge functions | **inga** — `supabase/functions/` finns inte `[KOD]` |

Total kodmängd i `src/`: ca **24 600 rader** inkl. genererade filer (`types.ts` 1457,
`routeTree.gen.ts` 589) `[KOD: wc -l]`.

---

## 2. Lagermodell (avsedd) vs implementerad

Avsedd modell (ADR-007): LifeOS = plattform, LifeAI = intelligens, LifeApp = kropp.

Implementerat idag:

```
src/routes/**            skal: auth-vakt, navigation, sidor (tunna adaptrar för planning/training)
src/platform/**          INERT kontraktslager: typer, ren logik, lokal in-memory-adapter
src/modules/**           domänmoduler: salary, finance, calendar, planning, training, main-ai
src/services/**          module-service.ts = enda bryggan modulregister → databas
src/integrations/**      genererade Supabase-klienter + auth-middleware (får ej editeras)
src/lib/**               format, defaults, felrapportering, schedule-ocr.functions.ts
```

`src/platform/**` gör **noll I/O** och importerar ingen affärslogik — bevakas av
`src/platform/__tests__/isolation.test.ts` `[TEST]`.

---

## 3. Kärnmoduler

### 3.1 Plattform / modulsystem (mest portabla delen)
| Fil | Ansvar |
| --- | --- |
| `src/platform/contracts.ts` | `AppManifest`, `Capability`, `Permission`, `contractVersion` |
| `src/platform/commands.ts` | `CommandEnvelope`, `CommandResult` (LifeAI → LifeApp) |
| `src/platform/events.ts` | `EventEnvelope` + validering, dedupe-nyckel |
| `src/platform/module-sdk.ts` | `LifeModuleManifest` v2, semver/caret-validering, `LIFEAPP_API_VERSION = 1.0.0` |
| `src/platform/module-registry.ts` | install/enable/disable/uninstall/update/rollback, felkoder, `activeRoutes()` — **ren logik, ingen DB** |
| `src/platform/module-state.ts` | härledda tillstånd, behörighetsgrindar |
| `src/platform/module-runtime.ts` | körtidsgrind: modul får bara sina beviljade permissions |
| `src/platform/module-catalog.ts` | kärnmanifest + `upcomingModules` (ren data) |
| `src/platform/adapter.ts` | `createLocalAdapter()` — kö i minnet, inga nätverksanrop, `dispatch()` svarar `not_implemented` |
| `src/platform/calendar-provider.ts` | `CalendarProvider`/`CalendarContribution` + register som filtrerar aktiverade moduler |

### 3.2 Domänmoduler
| Modul | Filer | Ansvar |
| --- | --- | --- |
| salary | `src/modules/salary/{compute,ob,breaks,templates,parser,conflicts}.ts` | lönemotor: bas, OB, raster, midnattspass, jour/beredskap. Ren TS, inga DB-anrop `[KOD]` |
| calendar | `src/modules/calendar/{source,holidays,namedays}.ts` | dagindex, svenska helg-/namnsdagar, `module`-bidrag |
| planning | `src/modules/planning/**` (manifest, views, rotations, tax, vacation, 2 vyer) | referensmodul; `/planering`, `/insikter` |
| training | `src/modules/training/**` (service 682 rader, summary, calendar, hooks, 6 komponenter) | första nybyggda modulen, egen DB-yta + kalenderadapter |
| finance | `src/modules/finance/score.ts` | enkel score-beräkning |
| main-ai | `src/modules/main-ai/**` | **fryst prototyp** (ADR-007) |

### 3.3 main-ai-prototypen (det som liknar en agent)
- `main-ai-service.functions.ts` (515 rader): auth-skyddade `createServerFn` för
  konversationer, meddelanden, tasks, approvals, audit. Explicit ägarkontroll
  (`assertConversationOwner`) **utöver** RLS. Historikpolicy: max 30 meddelanden,
  8 000 tecken/meddelande. Audit är "best effort" i try/catch `[KOD]`.
- `providers/gemini-provider.ts`: direkt REST mot Generative Language API,
  30 s timeout, statusmappning (`provider_auth_failed`, `provider_rate_limited`,
  `provider_unavailable`, `provider_timeout`), läcker aldrig providersvaret vidare.
- `provider.ts`: registry med **en** adapter, aktiveras bara om `GEMINI_API_KEY` finns.
- `src/routes/_app/main-ai.tsx` (583 rader): chatt-UI, arkivering, döpning, task-godkännande.

**Det finns ingen** planerare, verktygsloop, stegkedja, ReAct-loop, retry-policy eller
prompt-bibliotek. Modellen anropas en gång per användarmeddelande `[KOD]`.

---

## 4. Dokumentextraktion (OCR) — faktiskt läge

- Enda implementationen: `src/lib/schedule-ocr.functions.ts` (132 rader).
  Auth-skyddad `createServerFn`, POST av data-URL till
  `https://ai.gateway.lovable.dev/v1/chat/completions`, modell `google/gemini-2.5-flash`,
  strikt `json_schema`, svensk prompt, grov regexfiltrering av rader `[KOD]`.
- Enda konsument: `src/routes/_app/importera.tsx` (509 rader) — förhandsgranskning + import.
- **Saknas helt** jämfört med ADR-006: klassificering, typbekräftelse, per-fält-confidence-grind,
  spökpass-skydd, `content_hash`-dubblettskydd, import-batch/ångra, routing till flera moduler,
  retry/backoff, manuell fallback-väg.
- Prototypkod för detta ligger **oanvänd i repo-roten**: `classify.ts`, `import-router.ts`,
  `ocr-client.ts` — importeras inte av någon fil under `src/` `[KOD: rg]`.

## 5. Minne, förslag, dedupe — faktiskt läge

- Tabellen `ai_memory` finns i databasen men **ingen kodrad läser eller skriver den** `[KOD: rg]`.
- `user_defaults` används av `src/lib/defaults.ts` (key→jsonb upsert) — enkelt
  nyckel/värde-minne med `confidence`-kolumn, inget godkännandeflöde.
- Dedupe finns på två ställen: `EventEnvelope`-dedupe i `adapter.ts` (in-memory `Set`) och
  fingeravtryck vid schemaimport i importflödet.
- **Ingen** File-to-Memory, ingen semantisk sökning, inga embeddings, ingen `pgvector`.

## 6. Kodexekvering (JS/TS/Python)

**Finns inte.** Ingen `eval`, `new Function`, `child_process`, Pyodide, vm2 eller sandbox
någonstans i `src/` `[KOD: rg]`. Körmiljön (edge worker) tillåter dessutom inte
`child_process` — en sandbox skulle kräva extern körtjänst.

## 7. Sökning

Ingen global sök, ingen fulltextsökning, inget `tsvector`-index. `cmdk` finns som beroende
men används inte som kommandopalett `[KOD]`.

---

## 8. Databas `[DB]`

29 publika tabeller, samtliga med minst en RLS-policy. Ägarskap sker via `user_id = auth.uid()`
(profiles via `id`). 15 migrationer i `supabase/migrations/`.

Grupper:
- **Arbete/lön:** `shifts`, `shift_templates`, `work_profiles`, `weekly_patterns`, `rotations`,
  `absences`, `vacation_balance`, `profiles`
- **Ekonomi:** `expenses`
- **Tidslinje/signaler:** `timeline_events`, `signals`, `reminders`
- **Träning:** `training_templates`, `training_template_exercises`, `training_sessions`,
  `training_session_exercises`, `training_sets` (user_id-FK mot förälderns user_id)
- **Moduler:** `module_installations`, `module_audit_events` (audit: ingen UPDATE/DELETE)
- **MainAI:** `main_ai_conversations`, `main_ai_messages`, `main_ai_tasks`,
  `main_ai_approvals`, `main_ai_audit_events`
- **Övrigt:** `ai_memory` (oanvänd), `user_defaults`, `teams`, `team_members`, `user_roles`

Funktioner: `has_role()` (security definer, roller i separat tabell — korrekt mönster),
`handle_new_user()`, `update_updated_at_column()`.

**Divergens:** rot-SQL `UPGRADE_02…08_*.sql` beskriver `owner_contexts`, `context_members`,
`pay_lines`, `pay_rules`, `documents`, `import_batches` — **inga av dessa finns i databasen**
och inga finns i `src/integrations/supabase/types.ts` `[DB + KOD]`. Dessa filer är alltså
specifikation, inte tillämpad migration.

---

## 9. Dataflöden

```
UI (routes/_app/*)  --react-query-->  supabase browser client  --RLS-->  Postgres
UI (importera)      --useServerFn-->  schedule-ocr.functions   --HTTP-->  Lovable AI Gateway
UI (main-ai)        --useServerFn-->  main-ai-service.functions --HTTP-->  Gemini REST
UI (tillagg)        ------------->    services/module-service  --------->  module_installations
modul (training)    --provider-->     calendar-provider register --->     kalender-UI
```

De flesta sidor pratar **direkt** med Supabase-klienten (33 filer importerar
`integrations/supabase`) — det finns inget datalager mellan UI och databas, utom för
träning (`service.ts`) och moduler (`module-service.ts`) `[KOD]`.

## 10. Plattformslåsning

| Hårt kopplat | Varför |
| --- | --- |
| `src/integrations/supabase/*` | genererade, får ej editeras; nycklar via Lovable Cloud |
| `src/start.ts`, `src/server.ts`, `src/router.tsx` | TanStack Start-bootstrap |
| `src/routes/**` | filbaserad routing + `routeTree.gen.ts` |
| `schedule-ocr.functions.ts` | anropar `ai.gateway.lovable.dev` med `LOVABLE_API_KEY` |
| 33 filer med direkt Supabase-anrop | RLS-beroende affärslogik i vyer |

| Generellt / flyttbart | Varför |
| --- | --- |
| `src/platform/**` | ren TS, noll I/O, testad isolering |
| `src/modules/salary/**` | ren beräkning |
| `src/modules/calendar/{holidays,namedays,source}.ts` | ren data/logik |
| `src/modules/training/{summary,types,calendar,events}.ts` | ren logik ovanpå typer |
| `src/modules/planning/{rotations,tax,vacation,views}.ts` | ren logik |
