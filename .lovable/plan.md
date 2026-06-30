# Stor UX-förenkling – "Det här var oväntat enkelt"

Inga funktioner tas bort. Allt göms, grupperas eller flyttas så att Nivå 1 är det enda du ser från start.

## Nya principer (gäller hela appen)
- **En startpunkt:** Kalendern. Allt annat är sekundärt.
- **En + knapp:** Global FAB. Öppnar "Vad vill du lägga till?" bottom sheet.
- **Klick före formulär:** dag → panel, pass → detalj, lön → uträkning, OB → regler.
- **Smarta defaults:** senaste pass-tider, rast, profil, kategori fylls i automatiskt.
- **Mindre text:** ikoner + chips + summor istället för labels och hjälptexter.

## Navigering – från 7 flikar till 3
Nuvarande sidor: Kalender · Planering · Översikt · Jobb & lön · Pengar · Insikter · Inställningar.

Ny sidofältet:
```text
Kalender      ← allt händer här
Pengar        ← lön + utgifter + score i en vy
Insikter      ← förslag, mönster, tips
                ⋯ Mer (gömmer: Planering, Jobb, Inställningar)
```
"Planering" och "Jobb & lön" finns kvar som routes men nås via Mer-menyn och via klick i kalendern ("Visa hela veckan", "Hantera arbetsprofiler"). Inställningar flyttas till profilavatar uppe i hörnet.

## Kalendern (Nivå 1)
- Stor månadsvy, färgprickar per dag.
- Header: bara månad + pilar + idag. Ingen vy-väljare som default; svep/pinch zoomar till vecka/år (Mer-knapp för explicit val).
- **Inga inline-formulär.** Klick på dag = `DayPanel` bottom sheet (Nivå 2).
- **Long-press / högerklick på dag** = kontextmeny: Pass · Jour · Semester · Sjuk · VAB · Utgift · Påminnelse · Anteckning · Resa · Ledig.

## DayPanel (Nivå 2)
Visar dagen som en historia, inte ett formulär:
```text
Måndag 30 juni
┌──────────────────────────────┐
│ 07:00–16:00  Vården   1 240 kr│ ← klick = detalj
│ + Rast 30 min  · OB 0 kr      │
├──────────────────────────────┤
│ Utgift  ICA  −189 kr          │
├──────────────────────────────┤
│ + Lägg till                   │ ← öppnar QuickAdd sheet
└──────────────────────────────┘
```
Klick på pass = `ShiftDetail` (Nivå 2.5) som visar tider, rast, OB-rader, brutto, netto. Allt fält är ett klick = redigera inline.

## Global + knapp (FAB)
Stor guldknapp nere till höger. Öppnar `QuickAddSheet`:
```text
Vad vill du lägga till?
[Pass] [Utgift] [Inkomst] [Jour]
[Semester] [Påminnelse] [Resa] [Anteckning]
```
Varje val öppnar minimalt snabbkort (3 fält max), med smarta defaults från `user_defaults`-tabellen.

## Smarta defaults
Ny modul `src/modules/defaults/`:
- `learnFromShift(shift)`: uppdaterar `user_defaults` (vanligaste start/slut, rast, profil, kategori).
- `suggestShift(date)`: returnerar förslag baserat på veckodag + senaste pass.
- Visas som en grå "tryck för att fylla i" chip i QuickAdd.

## Lön & OB – progressiv
I `Pengar`:
- Stor siffra: **Den här månaden** netto.
- Klick → bryts ner: brutto · skatt · OB · övertid.
- Klick på OB → visar OB-regler för aktiv profil (Nivå 3, läs-läge med "Ändra" länk till inställningar).

## Inställningar – flyttas, förenklas
- Hub-sida (`/installningar`) blir 4 stora kort: **Profil** · **Lön & Arbete** · **Notiser** · **Avancerat**.
- Allt nuvarande innehåll behålls men flyttas in under rätt kort. Inget tas bort.
- Nås via avatar/initial uppe till höger i appheadern, inte via sidofält.

## Konkreta filer
**Nya**
- `src/components/quick-add-sheet.tsx` – global FAB + bottom sheet.
- `src/components/day-context-menu.tsx` – long-press/högerklick på dag.
- `src/components/shift-detail-sheet.tsx` – klickbar pass-detalj med inline-edit.
- `src/modules/defaults/index.ts` – inlärnings- och förslagslogik.
- `supabase/migrations/<ts>_user_defaults.sql` – tabell `user_defaults` (user_id, key, value jsonb) + RLS + GRANT.

**Ändras**
- `src/routes/_app.tsx` – ny nav (3 + Mer), avatar-meny för Inställningar, FAB-mount.
- `src/routes/_app/kalender.tsx` – ta bort inline-formulär, lägg in DayPanel + kontextmeny + smartare header.
- `src/routes/_app/pengar.tsx` – progressiv lön/utgift-vy (stor siffra → drilldown).
- `src/routes/_app/planering.tsx` – behålls, men flyttas till "Mer".
- `src/routes/_app/installningar.tsx` – kort-hub med 4 kategorier.

**Oförändrade** (bakom kulisserna): `modules/salary/*`, `modules/planning/*`, `modules/calendar/*`, alla beräkningar.

## Faser
1. **Nav + FAB + QuickAddSheet** – direkt synlig vinst.
2. **DayPanel + ShiftDetail + kontextmeny** – kalendern blir hub.
3. **Smarta defaults** – `user_defaults` tabell + inlärning.
4. **Pengar progressiv vy + Inställningar-hub**.

Vill du att jag kör alla 4 faserna i tur och ordning, eller vill du se Fas 1 först och godkänna innan jag fortsätter?