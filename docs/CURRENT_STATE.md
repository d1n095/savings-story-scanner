# Current State

**Uppdaterad:** 2026-07-30 · **Styrande:** [/AGENTS.md](../AGENTS.md)

Ärlig lägesbild. Uppdateras vid varje milstolpe. Inget här får skönmålas.

## 1. Verkligt och i drift

| Område | Var | Status |
| --- | --- | --- |
| Auth (e-post, återställning, callback) | `src/routes/auth*.tsx` | Fungerar |
| Appskal, sidebar, sessionsvakt, FAB | `src/routes/_app.tsx` | Fungerar |
| Arbetspass inkl. jour över midnatt | `src/modules/salary/*` | Fungerar |
| Löneberäkning: bas, OB, raster | `src/modules/salary/compute.ts`, `ob.ts`, `breaks.ts` | Fungerar, avstämning pågår |
| Schemaimport via bild (OCR) | `src/lib/schedule-ocr.functions.ts`, `/importera` | Fungerar, extern modell |
| Kalenderkällor, helgdagar, namnsdagar | `src/modules/calendar/*` | Fungerar |
| Planering: rotationer, skatt, semester | `src/modules/planning/*` | Delvis |
| Ekonomi-score | `src/modules/finance/score.ts` | Delvis |
| Plattformskontrakt, register, runtime | `src/platform/*` | Inert, testat |
| Life Store (läsvy) | `src/routes/_app/tillagg.tsx` | Endast läsning |

## 2. Endast prototyp

- `/main-ai` (`src/routes/_app/main-ai.tsx`, `src/modules/main-ai/**`) — gör externa
  AI-anrop, ligger i produktionsskalet. Byggs inte ut. Flyttas till LifeAI-repot.
- `src/platform/**` — kontrakt och lokal adapter utan nätverkstrafik. Inget produktionsflöde
  går ännu genom runtime.

## 3. Kända defekter

| # | Defekt | Påverkan |
| --- | --- | --- |
| D1 | Löneavstämning mot lönespecifikation ej färdig | Användaren kan inte bevisa att beräkningen stämmer |
| D2 | Historiska pass har ej omräknade rast-/OB-värden (medvetet pausat) | Historik och nuvarande regler kan visa olika belopp |
| D3 | Utgiftsflödet saknar kategorisering och överblick i djupet | J5 ofullständig |
| D4 | Kalendern saknar full dag/vecka/månad med timmar och övertid | J6 ofullständig |

## 4. Teknisk skuld

| # | Skuld | Risk |
| --- | --- | --- |
| T1 | Rotfiler utanför `src/` (`session.ts`, `db.ts`, `events.ts`, `shift-service.ts`, `finance-service.ts`, `*.CHANGED.tsx`) dubblerar kod under `src/` | Oklar sanning, risk att fel fil ändras |
| T2 | Modulgränser är konvention utan lint-skydd | Otillåtna importer kan smyga in |
| T3 | `owner_context_id` saknas på vissa tabeller | Försvårar LifeOS-driven authz |
| T4 | Många lösa spec-/prompt-filer i repo-roten | Svårt att veta vilket dokument som gäller |
| T5 | Ingen separat typecheck-kommando; typer kontrolleras via build | Långsammare återkoppling |

## 5. Olösta risker

- R1: Extern OCR-modell är enda undantaget från "inga betalda AI-anrop" — kostnadstak saknas.
- R2: Inga integrationstester mot databasen; RLS verifieras manuellt.
- R3: Ingen automatisk regressionssvit för löneberäkning mot verkliga lönespecifikationer.
