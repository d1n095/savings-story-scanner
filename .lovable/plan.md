# Enkel plan: fixa det du behöver nu

Vi glömmer den stora backloggen. Tre saker, i denna ordning:

## 1. Jourpass över natten (sovande / vaken jour)

Idag antar appen att ett pass är "vanligt arbete". Vi lägger till **passtyp** på ett pass:

- Vanligt pass
- Vaken jour (aktiv hela natten, egen ersättning)
- Sovande jour (sover, men på plats — låg ersättning, plus utryckningstid om du vaknar)
- Beredskap (hemma, kan bli inkallad)

I passformuläret:
- Toggla passtyp med fyra chips högst upp
- Om jour/beredskap: två extra fält — **jour-timmar** och **aktiv tid (utryckning)** i minuter
- Passet får gå över midnatt (Lördag 20:00 → Söndag 08:00 = ETT pass, inte två)

Backend:
- Migration lägger till `shifts.shift_type`, `shifts.on_call_hours`, `shifts.active_minutes`, `shifts.on_call_rate`
- I profilen (Lön & Arbete) kan du sätta separata satser för Vaken jour / Sovande jour / Beredskap / Utryckning
- Lönebeloppet räknas rätt även när passet spänner över midnatt

## 2. Ladda upp bild på schema → automatiskt inlagt

Ny sida **"Importera schema"** som du når via + i menyn:

1. Du drar in eller väljer bild (foto, screenshot, PDF)
2. Appen skickar bilden till en AI-modell som läser ut passen (datum, start, slut, ev. jour/rast)
3. Du får en **förhandsgranskning** — en lista med alla pass den hittade, gulmarkerat där den är osäker
4. Du kan rätta direkt i listan (klicka och ändra tid, ta bort rad, ändra typ till jour)
5. Klicka **"Lägg in alla"** → passen sparas

Tekniskt: en server-funktion anropar Lovable AI (Gemini Flash Lite) med structured output. Detta är enda stället i appen som använder betald AI — allt annat är gratis och lokalt.

## 3. Förenkla det som är rörigt

Konkret röjning i denna våg (inga nya funktioner, bara mindre):

- **Startsida `/idag`**: en stor siffra (dagens intjäning), ett kort "nästa pass", ett kort "månad hittills". Inget mer högst upp.
- **Snabbknappar** överallt: bara `+ Pass` och `+ Importera schema` som primära. Övriga (utgift, semester, påminnelse) samlas bakom **⋯ Mer**.
- **Inställningar → Lön & Arbete**: samma kortstack som idag, men jour/beredskap läggs som **ett** kort ("Jour & beredskap") istället för utspritt.
- **Kalender**: pass som går över midnatt visas som ETT block med pil "→ imorgon 08:00" på startdagen, ingen dubblett på slutdagen.
- Text på svenska genomgående, mindre engelska termer.

## Ordning jag jobbar i

1. Migration för `shift_type` + jour-fält och nya profilsatser
2. Formuläret för nytt/redigerat pass med passtyp och midnatts-stöd
3. Kalendern renderar midnattspass rätt
4. Ny sida `/import/schema` med bilduppladdning + AI-tolkning + förhandsgranskning
5. Städa `/idag`, snabbknappar, inställningarna

## Vad jag INTE gör nu

- Ingen lönespec-import
- Ingen ny dashboard
- Ingen designomskrivning
- Inga nya moduler

Säg okej så börjar jag med migrationen i steg 1.
