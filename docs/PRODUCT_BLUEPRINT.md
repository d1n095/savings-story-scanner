# LifeApp — Product Blueprint

**Status:** Levande dokument · **Skapad:** 2026-07-30
**Styrande dokument:** [/AGENTS.md](../AGENTS.md)

Detta dokument definierar *vad* LifeApp är. Strukturell inventering finns i
[LIFEAPP_ARCHITECTURE.md](LIFEAPP_ARCHITECTURE.md); modulmekaniken i
[LIFEAPP_MODULE_SYSTEM.md](LIFEAPP_MODULE_SYSTEM.md). Det som redan står där
upprepas inte här.

## 1. Produktgräns

LifeApp är användarens arbetsyta. Den äger UI, navigation, domänmoduler och lokal
verkställighet av behörigheter (RLS). Den äger **inte** identitetsplattformen
(LifeOS) och **inte** intelligenslagret (LifeAI/MainAI).

| Ingår i LifeApp | Ingår inte |
| --- | --- |
| Moduler: lön, ekonomi, kalender, planering, dokument | Agentkärna, planering/beslut som tjänst |
| Skal: nav, dashboard, Life Store-vy, inställningar | Modulsignering och distributionsnät |
| RLS-verkställighet i egen databas | Central identitet, SSO, org-hantering |
| Emitterade events och mottagna, validerade kommandon | Policybeslut och audit-lagring på plattformsnivå |

## 2. Lagermodell

```text
LifeAI    föreslår      →  LifeOS  auktoriserar  →  LifeApp  verkställer
LifeApp   emitterar     →  LifeOS  auditerar     →  LifeAI   observerar
```

LifeAI får aldrig direktkanal till LifeApp:s databas. Ett kommando är ett förslag
tills avsändare, capability, permission och ägarkontext är validerade.

## 3. Användarresor (V1)

| # | Resa | Moduler | Status |
| --- | --- | --- | --- |
| J1 | Registrera/logga in och landa på dagsvyn | core, auth | Byggd |
| J2 | Lägga in ett arbetspass, inkl. jour över midnatt | salary | Byggd |
| J3 | Importera schema från bild och godkänna passen | salary, document | Byggd (extern OCR) |
| J4 | Se lön per månad med OB, raster och avstämning | salary | Delvis |
| J5 | Registrera och överblicka utgifter | finance | Delvis |
| J6 | Planera i kalender över dag/vecka/månad | calendar, planning | Delvis |
| J7 | Se och hantera tillägg i Life Store | core | Läsvy |

Varje resa som markeras "Byggd" måste ha en rad i
[REQUIREMENTS_TRACEABILITY.md](REQUIREMENTS_TRACEABILITY.md).

## 4. Modulmodell

En modul = en domän. Den deklarerar sitt manifest, sina routes, permissions,
events och kommandon enligt [MODULE_STANDARD.md](MODULE_STANDARD.md), och körs bakom
Life Module Runtime. Kärnan (`src/modules/<modul>/`) är ren TypeScript utan
route-, UI- eller Supabase-beroenden i beräkningsfiler.

## 5. Standalone-strategi

```text
<modul>-core  (domänlogik, typer, kontrakt)
├── modul i LifeApp
└── fristående app
```

Endast skal, navigation och paketering skiljer. Ingen kodkopiering. Utbrytning till
`packages/<modul>-core` sker i Fas V enligt
[LIFEOS_INTEGRATION_PLAN.md](LIFEOS_INTEGRATION_PLAN.md).

## 6. Icke-mål

- Ingen egen agentkärna i detta repo (`/main-ai` är och förblir prototyp).
- Ingen multi-tenant org-hantering före V1.0.
- Inga betalda tjänster eller nya API-nycklar utan uttryckligt godkännande.
