# LifeOS/LifeAI — Integrationsplan för LifeApp

**Status:** Plan, ej implementerad · **Skapad:** 2026-07-30

Inga nätverksanrop, inga API-nycklar och inga datamigrationer ingår i detta steg.
Allt som finns i `src/platform/` idag är **typer och en inert lokal adapter**.

## Mål

Göra LifeApp anslutningsbar till LifeOS (plattform) och styrbar av LifeAI
(intelligens) utan att någon befintlig modul ändras.

## Gränsdragning

| Ansvar | LifeOS | LifeAI | LifeApp |
| --- | --- | --- | --- |
| Identitet och konton | ✅ | ❌ | konsumerar |
| Behörighetsverkställighet | ✅ | ❌ | verkställer lokalt (RLS) |
| Modulregister och install | ✅ | ❌ | publicerar manifest |
| Audit-logg | ✅ | läser | emitterar |
| Beslut/planering | ❌ | ✅ | visar och bekräftar |
| Kommandoutförande | validerar | föreslår | utför |
| Domänlogik (lön, ekonomi …) | ❌ | ❌ | ✅ |

Regel: **LifeAI får aldrig en direktkanal till LifeApp:s databas.**
All trafik går via LifeOS, som gör authz och audit.

## Faser

### Fas I — Kontraktsgrund (klar i detta steg)
- `src/platform/contracts.ts` — modulmanifest, capabilities, permissions, health.
- `src/platform/commands.ts` — inkommande kommandokuvert + resultat.
- `src/platform/events.ts` — utgående händelsekuvert.
- `src/platform/adapter.ts` — `PlatformAdapter`-gränssnitt + `createLocalAdapter()`
  (in-memory, no-op, ingen nätverkstrafik).
- `src/platform/manifest.ts` — LifeApp:s eget manifest, deklarativt, läser inget.

### Fas II — Manifest-publicering (kräver godkännande)
LifeApp exponerar sitt manifest via en läs-endpoint. Ingen skrivåtkomst.

### Fas III — Event-utgång
Befintligt emit-lager (ADR-005) speglas till adaptern bakom en feature-flagga.
Ingen förändring av `timeline_events`-schemat.

### Fas IV — Kommandoingång
Signerade kommandon från LifeOS tas emot i en `/api/public/*`-route med
signaturverifiering. Varje kommando kräver capability + permission + ägarkontext.
Destruktiva kommandon kräver `requiresApproval` och användarbekräftelse i UI.

### Fas V — Fristående paketering
Modul-kärnor bryts ut till `packages/<modul>-core` (workspace) och konsumeras av
både LifeApp och fristående skal. Ingen kodkopiering.

## Säkerhetskrav innan Fas IV

1. Asymmetrisk signaturverifiering av kommandokuvert (LifeOS-nyckel).
2. Nonce + `issuedAt`-fönster mot replay.
3. Allow-list av kommandonamn per modul, härledd ur manifestet.
4. Audit-rad för varje mottaget kommando, oavsett utfall.
5. Rate limit på ingången.
6. Ingen `service_role`-åtkomst från kommandovägen.

## Kvarstår

- Fas II–V (kräver godkännande, ett steg i taget).
- Konsolidering av dubblerade rotfiler (`session.ts`, `db.ts`, `events.ts` m.fl.).
- Flytt av `/main-ai`-prototypen till LifeAI-repot.
- Lint-regel som förhindrar `src/modules/** -> src/routes/**`-importer.
