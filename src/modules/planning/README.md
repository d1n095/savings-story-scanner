# Planning Module

Referensimplementation av en riktig Life Module. Följ den här strukturen när
nya moduler byggs (se [MODULE_STANDARD.md](../../../docs/MODULE_STANDARD.md)).

## Struktur

```text
src/modules/planning/
  index.ts                     # ENDA tillåtna importvägen utifrån
  module.ts                    # defineLifeModule(...) manifest
  views.ts rotations.ts        # ren domänlogik
  vacation.ts tax.ts
  components/PlanningView.tsx  # UI som skalet monterar på /planering
  components/InsightsView.tsx  # UI som skalet monterar på /insikter
  __tests__/                   # manifest, publik yta, routeskydd
```

## Gränser

- Modulen importerar aldrig från `src/routes/**`.
- Route-filerna `src/routes/_app/planering.tsx` och `.../insikter.tsx` är tunna
  adaptrar utan affärslogik.
- Andra moduler importerar endast `@/modules/planning` (index).
- Modulen äger inga egna tabeller; den läser `shifts` och `absences` via RLS
  som inloggad användare och skriver bara det användaren uttryckligen sparar.

## Ansvar

Vecko-, månads-, kvartals-, halvårs- och årsvyer, semesteranalys,
rotationsmönster, skatteschablon och lokala insikter. Ingen paid AI — all
analys är deterministisk och körs lokalt.
