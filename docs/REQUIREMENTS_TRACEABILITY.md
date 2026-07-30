# Requirements Traceability

**Uppdaterad:** 2026-07-30 · **Styrande:** [/AGENTS.md](../AGENTS.md)

Varje krav ska gå att följa: krav → arkitekturkomponent → filer → databasobjekt →
tester → verifieringsstatus. Rader utan test eller verifiering är **inte** klara.

**Statusvärden:** `Verifierad` · `Implementerad, ej verifierad` · `Delvis` · `Prototyp` · `Blockerad` · `Planerad`

| ID | Krav | Komponent | Implementationsfiler | Databas | Tester | Status |
| --- | --- | --- | --- | --- | --- | --- |
| R-AUTH-1 | Användare kan registrera sig, logga in och återställa lösenord | core/auth | `src/routes/auth.tsx`, `auth_.forgot-password.tsx`, `auth_.reset-password.tsx`, `auth_.callback.tsx` | `auth.users`, `profiles` | — | Implementerad, ej verifierad |
| R-AUTH-2 | Skyddade vyer kräver session | core/shell | `src/routes/_app.tsx` | RLS på alla ägda tabeller | — | Implementerad, ej verifierad |
| R-SAL-1 | Arbetspass kan registreras, inkl. jour över midnatt | salary | `src/components/action-sheet/flows/shift-flow.tsx`, `src/modules/salary/compute.ts` | `shifts` | — | Delvis |
| R-SAL-2 | OB beräknas per intervall och passtyp | salary | `src/modules/salary/ob.ts` | `ob_rules` | `ob-midnight.test.mjs` | Delvis |
| R-SAL-3 | Raster dras automatiskt enligt regler | salary | `src/modules/salary/breaks.ts` | `break_rules` | — | Delvis |
| R-SAL-4 | Löneavstämning mot lönespecifikation | salary | — | `pay_lines`, `pay_rules`, `payslips` | — | Planerad (D1) |
| R-SAL-5 | Historiska pass räknas inte om automatiskt | salary | snapshot-fält på `shifts` | `shifts.verification_status` | — | Implementerad, ej verifierad |
| R-IMP-1 | Schema kan importeras från bild och godkännas | document | `src/lib/schedule-ocr.functions.ts`, `src/routes/_app/importera.tsx` | `import_batches` | — | Implementerad, ej verifierad |
| R-IMP-2 | Dubbletter upptäcks vid import | document | fingerprint i importflödet | `shifts` | — | Implementerad, ej verifierad |
| R-FIN-1 | Utgifter kan registreras och överblickas | finance | `src/components/action-sheet/flows/expense-flow.tsx`, `src/routes/_app/pengar.tsx` | `expenses` | — | Delvis (D3) |
| R-CAL-1 | Kalender i dag/vecka/månad med timmar och övertid | calendar | `src/routes/_app/kalender.tsx`, `src/modules/calendar/*` | `shifts`, kalenderkällor | — | Delvis (D4) |
| R-PLAT-1 | Modulmanifest, kommandon och events är typade kontrakt | platform | `src/platform/contracts.ts`, `commands.ts`, `events.ts` | — | `platform-contracts.test.ts` | Verifierad |
| R-PLAT-2 | Plattformslagret är isolerat från affärslogik | platform | `src/platform/index.ts` | — | `isolation.test.ts` | Verifierad |
| R-PLAT-3 | Moduler kan installeras, aktiveras, uppdateras, rullas tillbaka | platform | `src/platform/module-registry.ts`, `module-runtime.ts`, `module-sdk.ts` | — | `module-system.test.ts` | Verifierad |
| R-PLAT-4 | Life Store visar behörigheter och kompatibilitet | core | `src/routes/_app/tillagg.tsx`, `src/platform/module-catalog.ts` | — | `module-state.test.ts` | Verifierad |
| R-PLAT-5 | Installationstillstånd persisteras per användare med RLS | core | `src/services/module-service.ts`, `src/platform/module-state.ts`, `src/hooks/use-modules.ts` | `module_installations` | `module-service.test.ts` | Verifierad |
| R-PLAT-6 | Navigation och routeåtkomst följer aktiverade moduler | core | `src/routes/_app.tsx`, `src/platform/module-state.ts` | `module_installations` | `module-state.test.ts` | Verifierad |
| R-PLAT-7 | Modulåtgärder är spårbara i en auditlogg | core | `src/services/module-service.ts`, `src/routes/_app/tillagg.tsx` | `module_audit_events` | `module-service.test.ts` | Verifierad |
| R-MOD-1 | Planering är extraherad som första riktiga Life Module | modules/planning | `src/modules/planning/module.ts`, `index.ts`, `components/PlanningView.tsx`, `components/InsightsView.tsx`, `src/modules/catalog.ts` | `shifts`, `absences` (RLS) | `src/modules/planning/__tests__/module.test.ts` | Verifierad |
| R-MOD-2 | Route-filer för moduler innehåller ingen affärslogik | core/shell | `src/routes/_app/planering.tsx`, `src/routes/_app/insikter.tsx` | — | `src/modules/planning/__tests__/module.test.ts` | Verifierad |
| R-CAL-1 | Modulhändelser visas i kalendern via plattformskontrakt, aldrig direkta tabellfrågor | platform + modules/training + modules/calendar | `src/platform/calendar-provider.ts`, `src/modules/training/calendar.ts`, `src/modules/calendar-providers.ts`, `src/hooks/use-calendar-contributions.ts`, `src/modules/calendar/source.ts`, `src/routes/_app/kalender.tsx` | `training_sessions` (RLS) | `src/modules/training/__tests__/calendar-integration.test.ts` | Verifierad |
| R-CAL-2 | Kalenderbidrag försvinner när modulen inaktiveras och återkommer vid aktivering | platform | `src/platform/calendar-provider.ts`, `src/hooks/use-calendar-contributions.ts` | — | `src/modules/training/__tests__/calendar-integration.test.ts` | Verifierad i webbläsare |
| R-GOV-1 | Projektet har ett permanent styrsystem | governance | `/AGENTS.md`, `docs/PRODUCT_BLUEPRINT.md`, `docs/MODULE_STANDARD.md`, `docs/DEFINITION_OF_DONE.md`, `docs/CURRENT_STATE.md`, `docs/DECISIONS.md`, denna fil | — | — | Verifierad (dokumentation) |
| R-AI-1 | MainAI-prototypen byggs inte ut | governance | `src/routes/_app/main-ai.tsx` | `main_ai_*` | — | Prototyp (fryst) |

## Underhåll

Vid varje milstolpe: lägg till nya rader **innan** kod skrivs, och uppdatera status
i verifieringssteget. En rad flyttas till `Verifierad` endast med bevis enligt
[DEFINITION_OF_DONE.md](DEFINITION_OF_DONE.md).
