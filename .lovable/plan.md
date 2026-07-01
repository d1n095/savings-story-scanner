# Total förenkling av Lön & Arbete

Målet: användaren är igång på under 2 minuter. Ingen skrollning. Inga formulär. Kort och snabbval.

## 1. Onboarding-guide (3 steg)

Ny komponent `src/components/onboarding/SalaryWizard.tsx`:
- Steg 1: **Vad jobbar du som?** (fritext, t.ex. "Undersköterska")
- Steg 2: **Vad heter arbetsplatsen?** (fritext, t.ex. "Securitas")
- Steg 3: **Timlön eller månadslön?** → belopp
- Klart. Skapar `work_profiles`-raden med smarta standarder (rast auto 30 min efter 5 h, tom OB, standardprofil = ja).

Triggas första gången användaren öppnar `/installningar/lon-arbete` utan aktiv arbetsprofil, eller via en tydlig **"Kom igång"**-knapp om det finns profil men den är tom.

## 2. Timlön — bort med stepper

Uppdatera `NumericField` så `showQuick` default = `false`. På Lön & Arbete: bara ett rent fält, `143 kr/timme`. Skriv, markera, klistra in, decimaler. Ingenting annat.

## 3. OB som val, inte regler

Ersätt "OB-regler"-sektionen med **Ersättningar**-kort:
- Rad av chips: `Kväll` `Natt` `Helg` `Röd dag` `Jour` `Beredskap` + `+`
- Klick på chip → bottom sheet: **belopp (kr/h eller %)** → Klar
- Automatiska tider (Kväll 18–22, Natt 22–06, Helg lör 00–sön 24, etc.) sätts internt
- Visas som kort: `Kväll · 25 kr/h` — tryck för att ändra/ta bort
- "Avancerat"-knapp längst ner öppnar den gamla regelbyggaren för power users

## 4. Raster på vanlig svenska

Ny `BreaksCard.tsx`:
- Rubrik: **Raster**
- 2 radio: `Jag lägger rast själv` / `Automatisk`
- Om Automatisk: lista av regler, varje som mening: *"30 minuters rast efter 5 timmars arbete."*
- `+ Lägg till ytterligare regel` → inline två numeriska fält (timmar, minuter)
- Auto-spara. Ingen Spara-knapp.

## 5. Startsida "Idag" alltid först

I `_app.tsx` finns redan `/idag`. Säkerställ att **🏠 Idag** är första flik i sidebar OCH i mobil-topbar, alltid synlig.

## 6. Kortbaserad Lön & Arbete-sida

Bygg om `installningar.lon-arbete.tsx` till en stack av kort:

```
Arbetsprofil: Securitas ▾
──────────────
Timlön              143 kr/h  →
──────────────
Ersättningar        3 aktiva  →
  Kväll 25 · Natt 45 · Helg 40
──────────────
Raster              30 min efter 5 h  →
──────────────
Semester            25 dagar  →
──────────────
[ Visa avancerat ▾ ]
```

Varje kort → bottom sheet med detaljer. Max 5–6 kort synliga. Skatt, pension, provision, etc. bakom "Visa avancerat".

## 7. Auto-spara överallt

Ta bort explicit `Spara`-knappar där det går. Debounced save (500 ms) på alla numeriska fält och toggles. Toast "Sparat" diskret.

## 8. Smarta standarder (befintligt `user_defaults`)

Redan på plats för pass. Utöka:
- `break.pattern` — om samma rast använts 3 ggr → föreslå auto-regel via toast med "Använd alltid" knapp
- `shift.pattern` — om samma pass 3 ggr → toast "Gör till standardpass?"
- Vid pass-skapande, om bara en `work_profiles`-rad är default = förvälj utan att fråga (redan så)

Implementera pattern-detektion i `src/lib/patterns.ts` som körs efter shift/break-save.

## 9. Snabbåtgärder högst upp

På `/idag`, `/kalender`, `/pengar`, `/installningar/lon-arbete`: en horisontell rad med chip-knappar högst upp:
`+ Pass` `+ Semester` `+ Jour` `+ Utgift` `+ Påminnelse` — öppnar respektive ActionSheet-flow direkt.

## 10. Filer som ändras / skapas

**Nya:**
- `src/components/onboarding/SalaryWizard.tsx`
- `src/components/settings/HourlyRateCard.tsx`
- `src/components/settings/CompensationsCard.tsx` (chips + sheet)
- `src/components/settings/BreaksCard.tsx`
- `src/components/settings/VacationCard.tsx`
- `src/components/quick-actions-bar.tsx`
- `src/lib/patterns.ts` (mönster-detektion)

**Ändras:**
- `src/components/ui/numeric-field.tsx` — `showQuick` default false
- `src/routes/_app/installningar.lon-arbete.tsx` — kortstack + wizard trigger
- `src/routes/_app.tsx` — säkerställ 🏠 Idag först i nav
- `src/routes/_app/idag.tsx`, `kalender.tsx`, `pengar.tsx` — snabbåtgärder-rad
- `src/components/action-sheet/flows/shift-flow.tsx` — trigga pattern-suggestion efter save

**Ingen DB-migration behövs** — allt återanvänder `work_profiles`, `user_defaults`, `break_rules`.

## 11. Vad som INTE ingår (i denna våg)

- Ombygget av kalender/planering
- Nya OB-tider utöver de 6 presetsen
- Multi-profil-växling utöver befintlig dropdown

Säg till om något ska tas bort eller läggas till, annars kör jag hela vågen på en gång.
