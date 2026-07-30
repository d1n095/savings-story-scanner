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
| R-PLAT-4 | Life Store visar behörigheter och kompatibilitet | core | `src/routes/_app/tillagg.tsx`, `src/platform/module-catalog.ts` | — | — | Implementerad, ej verifierad |
| R-GOV-1 | Projektet har ett permanent styrsystem | governance | `/AGENTS.md`, `docs/PRODUCT_BLUEPRINT.md`, `docs/MODULE_STANDARD.md`, `docs/DEFINITION_OF_DONE.md`, `docs/CURRENT_STATE.md`, `docs/DECISIONS.md`, denna fil | — | — | Verifierad (dokumentation) |
| R-AI-1 | MainAI-prototypen byggs inte ut | governance | `src/routes/_app/main-ai.tsx` | `main_ai_*` | — | Prototyp (fryst) |

## Underhåll

Vid varje milstolpe: lägg till nya rader **innan** kod skrivs, och uppdatera status
i verifieringssteget. En rad flyttas till `Verifierad` endast med bevis enligt
[DEFINITION_OF_DONE.md](DEFINITION_OF_DONE.md).
