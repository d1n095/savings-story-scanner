# LifeApp — Module Standard

**Status:** Normativ · **Skapad:** 2026-07-30 · **Styrande:** [/AGENTS.md](../AGENTS.md)

Mekaniken (register, runtime, Life Store) beskrivs i
[LIFEAPP_MODULE_SYSTEM.md](LIFEAPP_MODULE_SYSTEM.md). Detta dokument är **kravbilden**:
vad en modul måste uppfylla för att få installeras och aktiveras.

## 1. Katalogstruktur

```text
src/modules/<modul>/
  index.ts          # publikt API — enda tillåtna importvägen utifrån
  module.ts         # defineLifeModule(...) manifest
  <domän>.ts        # ren domänlogik, inga route-/UI-/klientberoenden
  __tests__/        # enhetstester för domänlogiken
  README.md         # syfte, ansvar, gränser
```

Regler:
- Ingen import från `src/routes/**` i en modul.
- Ingen direkt Supabase-klient i beräkningsfiler; dataåtkomst går via injicerade portar.
- Andra moduler får endast importera från `src/modules/<modul>/index.ts`.

## 2. Manifest

Byggs med `defineLifeModule()` från [`src/platform/module-sdk.ts`](../src/platform/module-sdk.ts)
och valideras strukturellt av [`src/platform/contracts.ts`](../src/platform/contracts.ts).

Obligatoriska fält: `id`, `name`, `version` (semver), `apiVersion`, `description`,
`capabilities`, `permissions` (med motivering), `routes`, `events`, `commands`,
`dependencies`, `standalone`.

Krav:
- `id` matchar `^[a-z][a-z0-9-]*$` och är unikt.
- Varje permission i ett kommandos `requiredPermissions` måste också stå i modulens `permissions`.
- Endast deklarerade routes får registreras i skalet.
- Endast deklarerade events får publiceras/konsumeras.
- Endast deklarerade kommandon får tas emot.

## 3. Behörigheter

Formen är `<domän>:<åtgärd>` (t.ex. `shifts:read`). Runtime beviljar aldrig mer än
manifestet begär och aldrig mer än användaren godkänt. Hemligheter och AI-nycklar
nekas alltid (`canReadSecret` → false + auditrad).

## 4. Kommandon och events

| Typ | Riktning | Kuvert |
| --- | --- | --- |
| Kommando | in till modulen | `CommandEnvelope` ([`src/platform/commands.ts`](../src/platform/commands.ts)) |
| Event | ut från modulen | `EventEnvelope` ([`src/platform/events.ts`](../src/platform/events.ts)) |

Destruktiva kommandon kräver `requiresApproval: true` och användarbekräftelse i UI.

## 5. Livscykel

`install → enable → (update | rollback) → disable → uninstall`

- Uppdatering som misslyckas ska kunna rullas tillbaka till föregående version.
- Inaktiverad eller trasig modul nekas allt: routes, data, events, kommandon.
- Avinstallation får inte radera användardata utan uttryckligt godkännande.

## 6. Versionskompatibilitet

- `apiVersion` styr runtime-kompatibilitet; inkompatibel modul installeras inte.
- Beroenden anges som semver-range (`^1.0.0`); obligatoriskt beroende som saknas blockerar aktivering.
- Brytande ändring av ett kontrakt kräver höjd `CONTRACT_VERSION` och en rad i
  [DECISIONS.md](DECISIONS.md).

## 7. Checklista innan en modul anses klar

- [ ] Manifest validerar utan fel
- [ ] Domänlogiken har enhetstester
- [ ] Inga importer från routes eller andra moduler internt
- [ ] Alla routes, events, kommandon deklarerade
- [ ] RLS på alla tabeller modulen äger
- [ ] Empty/loading/success/error-tillstånd i UI-skalet
- [ ] Rad i [REQUIREMENTS_TRACEABILITY.md](REQUIREMENTS_TRACEABILITY.md)
