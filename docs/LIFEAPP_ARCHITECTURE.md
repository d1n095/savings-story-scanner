# LifeApp — Arkitektur

**Status:** Levande dokument · **Skapad:** 2026-07-30 · **Omfattning:** detta repo

Detta projekt är **LifeApp** — kroppen och användargränssnittet i LifeOS-ekosystemet.
Det är **inte** LifeAI/MainAI-kärnan och ska inte bli det.

## Lagermodell

```
Lager 1 — LifeOS   (plattform)      identitet, behörigheter, datalagring, modulregister,
                                     installation/uppdatering, audit-logg, events/kommandon,
                                     säkerhetspolicyer, synk mellan appar och enheter
Lager 2 — LifeAI   (huvudet)        MainAI, minne, planering, arbets-/kodagenter, beslut,
                                     godkännanden, analys, automatisering, orkestrering
Lager 3 — LifeApp  (detta projekt)  moduler användaren arbetar i: ekonomi, lön, kalender,
                                     dokument, boende, hälsa, shopping, företag …
```

### Säkerhetsgräns (icke förhandlingsbar)

LifeAI får **orkestrera** men aldrig **verkställa**. Behörighetskontroll, policyer och
audit sker tekniskt i LifeOS (och i LifeApp:s RLS), aldrig i intelligenslagret.
Ett kommando från LifeAI är ett *förslag* tills LifeOS/LifeApp har validerat
avsändare, capability, permission och ägarskapskontext.

```
LifeAI  --command-->  LifeOS (policy + authz)  --validerat kommando-->  LifeApp
LifeApp --event-->    LifeOS (audit + fan-out) --event-->               LifeAI
```

## Nuvarande struktur (inventering 2026-07-30)

### Routes
| Route | Fil | Roll |
| --- | --- | --- |
| `/` | `src/routes/index.tsx` | landning |
| `/auth`, `/auth/*` | `src/routes/auth*.tsx` | inloggning, återställning, callback |
| `/_app` | `src/routes/_app.tsx` | skal: sidebar, FAB, sessionsvakt |
| `/idag` | `_app/idag.tsx` | dagsvy |
| `/kalender` | `_app/kalender.tsx` | kalender |
| `/pengar` | `_app/pengar.tsx` | ekonomi |
| `/jobb` | `_app/jobb.tsx` | arbete och lön |
| `/planering` | `_app/planering.tsx` | planering |
| `/insikter` | `_app/insikter.tsx` | insikter |
| `/dashboard` | `_app/dashboard.tsx` | översikt |
| `/importera` | `_app/importera.tsx` | schema-/dokumentimport |
| `/installningar/*` | `_app/installningar*.tsx` | inställningar |
| `/main-ai` | `_app/main-ai.tsx` | **PROTOTYP** — se nedan |

### Domänmoduler (`src/modules/`)
- `salary` — beräkning, OB, raster, mallar, parser, konflikter
- `finance` — score
- `calendar` — källa, helgdagar, namnsdagar
- `planning` — rotationer, skatt, semester, vyer
- `main-ai` — **prototyp**, se nedan

### Databeroenden
- Lovable Cloud (Supabase) via `@/integrations/supabase/client` (browser) och
  `client.server` (privilegierat, server).
- Serverlogik via `createServerFn` (`src/lib/schedule-ocr.functions.ts`,
  `src/modules/main-ai/main-ai-service.functions.ts`).
- Ägarskap via `owner_contexts` / `context_members` (ADR-002).
- Händelser via `timeline_events` + emit-lagret (ADR-005).

## `/main-ai` är en prototyp

`src/routes/_app/main-ai.tsx` och `src/modules/main-ai/**` är en **tillfällig prototyp**.
Regler:
- Bygg **inte** ut den till en riktig agentkärna.
- Radera den **inte** — den används som referens för kontraktsdesign.
- Den slutliga MainAI byggs i ett separat repo (LifeAI) och ansluts via kontrakten i
  `src/platform/`.

## Fristående moduler

En modul (t.ex. butikssystemet) ska ha **en** kärnlogik och två skal:

```
LifeApp            └── modul-kärna (domänlogik, ren TS, inga route-beroenden)
Fristående app     └── samma modul-kärna
```

Regel: domänlogik ligger i `src/modules/<modul>/` utan importer från `src/routes/`,
utan direkt Supabase-klientåtkomst i beräkningsfiler, och utan UI-beroenden.
Skalet (routes/komponenter) får bero på modulen — aldrig tvärtom.

## Arkitekturrisker (identifierade)

1. **Rotfiler utanför `src/`** — `session.ts`, `db.ts`, `events.ts`, `shift-service.ts`,
   `finance-service.ts`, `*.CHANGED.tsx` m.fl. ligger i repo-roten och dubblerar delvis
   kod under `src/`. Oklart vilken som är sanningen. Bör konsolideras (separat beslut).
2. **Prototyp-AI i produktions-skalet** — `/main-ai` gör riktiga externa AI-anrop och
   ligger i samma nav som affärsmodulerna. Bryter mot lagergränsen tills den flyttas.
3. **Modulgränser är konvention, inte tvingande** — inget lint-skydd hindrar att en
   modul importerar från en route eller från en annan modul.
4. **Ingen versionering av datakontrakt** — timeline/event-former är implicita.
   `src/platform/contracts.ts` inför explicit `contractVersion`.
5. **Ägarskapskontext delvis genomförd** — inte alla tabeller har `owner_context_id`,
   vilket försvårar LifeOS-driven behörighetsverkställighet.
