# AGENT_WORK_LOG — hur denna kartläggning utfördes

**Uppdrag:** MainAI Portability & Agent Benchmark. Läsande granskning, inga nya
slutkundsfunktioner, ingen UI-polering, ingen publicering.

Legend: `[KOD]` verifierat genom att läsa källfil · `[TEST]` verifierat genom testkörning ·
`[DB]` verifierat genom databasfråga · `[UI]` verifierat i gränssnittet · `[ANTAGANDE]` ·
`[REK]` rekommendation.

---

## 1. Filer och kommandon, i ordning

1. `ls src/modules src/platform src/lib src/services src/routes/_app` — strukturöversikt `[KOD]`
2. `cat package.json` — stack, skript, beroenden `[KOD]`
3. `ls supabase/migrations` — 15 migrationer; `ls supabase/functions` → **finns inte** `[KOD]`
4. `rg -l "createServerFn" src` — exakt två serverfunktionsfiler `[KOD]`
5. `wc -l` över alla `.ts/.tsx` — storleksprofil, hittade de sex största filerna `[KOD]`
6. `rg -l "integrations/supabase" src` — 33 filer med direkt DB-åtkomst `[KOD]`
7. `rg -l "describe\("` — 9 testfiler `[KOD]`
8. `wc -l` på rotfilerna — 1 224 rader parallellkod `[KOD]`
9. `head -60 src/modules/main-ai/main-ai-service.functions.ts` — historikpolicy, audit, ägarkontroll `[KOD]`
10. `rg -in "python|child_process|eval\(|new Function|vm2|pyodide" src` — **noll träffar** `[KOD]`
11. `rg -in "ai_memory|file-to-memory|user_defaults" src` — `ai_memory` bara i genererade typer `[KOD]`
12. `rg -n "documents:|import_batches:|pay_lines:|owner_contexts:" src/integrations/supabase/types.ts` — **noll träffar** `[KOD]`
13. `rg -n "from \"@/../(session|shift-service|import-router|classify)" src` — rotfiler oanvända `[KOD]`
14. `src/platform/module-registry.ts`, `module-sdk.ts`, `adapter.ts` (huvuden) — ren logik, noll I/O `[KOD]`
15. `src/integrations/supabase/auth-middleware.ts` — bearer-krav, `persistSession: false` `[KOD]`
16. `src/lib/schedule-ocr.functions.ts` (hela) — prompt, json_schema, felmappning `[KOD]`
17. `npx vitest run` → 9 filer, 113 tester, grönt `[TEST]`
18. `npx tsc -b --noEmit` → exit 0 `[TEST]`
19. `pg_policies`-fråga → alla 29 publika tabeller har ≥1 policy `[DB]`
20. `npm run build` → resultat i verifieringsavsnittet nedan `[TEST]`

## 2. Hypoteser och utfall

| Hypotes | Utfall |
| --- | --- |
| Det finns en agentloop med planering och verktyg | **Falsk.** Ett modellanrop per meddelande `[KOD]` |
| Dokumentmotorn från ADR-006 är delvis byggd | **Falsk.** Endast enkel schema-OCR; pipelinekod ligger oanvänd i roten `[KOD]` |
| `ai_memory` används av något minnesflöde | **Falsk.** Noll kodreferenser `[KOD]` |
| Rot-SQL är applicerad | **Falsk.** Tabellerna finns inte i databasen `[DB]` |
| Rotfilerna är levande kod | **Falsk.** Inga importer från `src/` `[KOD]` |
| Plattformslagret är verkligen inert | **Sann.** Bevakat av isolationstest `[TEST]` |
| Alla publika tabeller har RLS | **Sann** för de 29 som finns `[DB]` |
| Det finns kodexekvering (JS/Python) | **Falsk.** Ingen sandbox; edge-runtime tillåter inte subprocesser `[KOD]` |

## 3. Arkitekturbeslut i denna körning

1. **Rapportera enbart verifierbart läge.** Där spec och kod går isär beskrivs båda och
   divergensen namnges — ingen sammanslagning till en förskönad bild.
2. **Skilja "beslutad" från "byggd".** ADR-002/003/006 är beslutade men ogenomförda; det
   skrivs ut, inte gömt.
3. **Klassificera på beroenden, inte på hur snygg koden är.** En modul kan bara bli
   PORTA DIREKT om den saknar I/O och plattformsimport — kontrollerat per fil.
4. **Inga ändringar i befintlig kod.** Endast nya dokument + manifest. Ingen refaktorering
   för rapportens skull (uttryckligt krav).

## 4. Alternativ som övervägdes och avvisades

- **Automatiskt beroendediagram via madge/depcruise:** avvisat — nytt devberoende och
  installation i ett projekt som inte ska förändras. Använde `rg`-baserad kartläggning i stället.
- **Skriva `BENCHMARK_`-testdata i databasen** för att mäta importflödet: avvisat — kravet
  var läsande benchmark och skrivning skulle förorena användarens data.
- **Flytta/radera rotfilsdubbletterna:** avvisat — "radera inte befintliga dokument" och
  "ingen stor refaktorering". Rapporterat som KASSERA-kandidater i stället.
- **Slå ihop rapporten till en fil:** avvisat — beställningen specificerade fem artefakter.

## 5. Genvägar och kompromisser som redan finns i projektet

- Två `any`-användningar i serverfunktioner trots strikt regel i `AGENTS.md`.
- Audit-loggning som best-effort (`try {} catch {}`) i main-ai.
- `healthCheck()` som alltid svarar OK.
- Kopior av route-filer (`*.CHANGED.tsx`) i stället för versionshantering.
- Manuellt underhållen tillåtelselista i `isolation.test.ts` i stället för lint-regel.
- Duplicerad `user_id` i träningens barntabeller för att slippa join i RLS.

## 6. Misslyckade försök i denna körning

- `sed -n 1-60p` med felaktig syntax → `sed: unknown command` ; kört om med `'1,80p'`.
- Första kombinerade `rg`-körningen returnerade exit 1 (ingen träff i första uttrycket),
  vilket i sig blev bevis för att kodexekvering saknas.

## 7. Vad som **inte** kunde verifieras

- **Korsanvändar-RLS:** endast en session tillgänglig i miljön → policyer är verifierade via
  SQL-definition och kodläsning, inte via två samtidiga användare `[ANTAGANDE]`.
- **Faktiskt AI-svar från Gemini/gateway:** inga anrop gjordes (skulle kosta krediter och
  kräva nyckel) → adaptern är läst, inte kört `[ANTAGANDE]`.
- **OCR-kvalitet på verkliga scheman:** inte mätt i denna körning.
- **Produktionsprestanda:** ingen last- eller profilering utförd.
- **UI-flöden:** inga nya webbläsarflöden kördes denna gång; UI-påståenden i rapporten
  kommer från tidigare verifierade körningar och är märkta som sådana i arkitekturfilen.

## 8. Rekommenderad nästa åtgärd `[REK]`

1. Beslut om rotfilerna: arkivera eller radera (kräver ditt godkännande).
2. Testa main-ai och OCR innan något av det porteras.
3. Inför storleks-/MIME-gräns på bilduppladdning (billigaste säkerhetsvinsten).
4. Om modulmodellen ska bära vikt: verklig isolering + tvingande importgräns.
