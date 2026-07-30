# LifeApp Modulsystem — Life Modules, Runtime, SDK och Life Store

**Status:** Kontraktsgrund implementerad (inert) · **Skapad:** 2026-07-30

LifeApp är **inte** en monolit. Den är ett skal som installerar, aktiverar,
uppdaterar, inaktiverar och avinstallerar moduler.

```
LifeAI   — hjärnan: förstår, planerar, orkestrerar (separat repo)
LifeOS   — systemlagret: identitet, behörigheter, data, synk, events, modulhantering
LifeApp  — skalet + Life Module Runtime (detta repo)
Modules  — kalender, ekonomi, lön, hälsa, träning, boende, shopping, företag, recept …
```

## Delarna

| Del | Fil | Roll |
| --- | --- | --- |
| Life Module SDK | `src/platform/module-sdk.ts` | `LifeModuleManifest`, `defineLifeModule()`, apiVersion-kompatibilitet |
| Modulregister | `src/platform/module-registry.ts` | installera, aktivera, uppdatera, rulla tillbaka, avinstallera |
| Life Module Runtime | `src/platform/module-runtime.ts` | prövar routes, data, events, kommandon, hemligheter + audit |
| Life Store-katalog | `src/modules/catalog.ts` + `src/platform/module-catalog.ts` | ren data: modullagret sätter samman katalogen; plattformen håller ännu icke-flyttade kärnmanifest |
| Referensmodul | `src/modules/planning/` | första riktiga modulen: eget manifest, egen publik yta, tunna route-adaptrar |
| Life Store (UI) | `src/routes/_app/tillagg.tsx` | läsvy: installerade, tillgängliga, behörigheter, kompatibilitet |


## LifeApp Core (får aldrig ligga i en modul)

konto och identitet · navigation och dashboard · behörighetssystem · notiser ·
gemensam design · synkronisering · modulhanterare · kommunikation med LifeOS/LifeAI.

## Säkerhetsregler som runtime faktiskt verkställer

1. En modul får bara registrera routes som står i dess manifest.
2. En modul får bara de behörigheter användaren uttryckligen beviljat, och
   aldrig fler än manifestet begär.
3. En modul får inte röra en annan moduls datadomän (`canAccessDataScope`).
4. En modul får bara publicera/konsumera deklarerade events.
5. En modul får bara ta emot deklarerade kommandon.
6. En modul kan **aldrig** läsa AI-nycklar eller systemhemligheter — `canReadSecret`
   nekar alltid och loggar försöket.
7. Inaktiverade och trasiga moduler nekas allt.
8. Trasig uppdatering kan rullas tillbaka till föregående version.
9. LifeAI föreslår; LifeOS + runtime avgör. Ingen genväg förbi RLS.

Signaturverifiering av modulpaket hör till Fas IV och sker i LifeOS —
LifeApp verifierar signaturen innan runtime laddar en tredjepartsmodul.

## Migreringsordning (inget rivs på en gång)

1. **Nu:** kontrakt, register, runtime, katalog, Life Store-vy. Additivt.
   Befintliga routes och data är orörda och körs fortfarande direkt i skalet.
2. Nästa: skalets navigation läses ur `registry.activeRoutes()` i stället för
   hårdkodade listor.
3. Sedan: en modul i taget (kalender först) flyttas bakom runtime-kontrollen.
4. Sedan: modulkärnor bryts ut till `packages/<modul>-core` så samma logik
   driver både LifeApp-modulen och en fristående app.
5. Sist: tredjepartsmoduler, signering och betalflöde i Life Store.

## Samma modul, flera produkter

```
commerce-core (affärslogik, datamodeller, API-kontrakt)
├── installerad modul i LifeApp
├── företagssektionen i LifeApp
└── fristående butiksapp
```

Endast skal, navigation och paketering skiljer. Ingen kodkopiering.

## MainAI-prototypen

`/main-ai` får ligga kvar som referens. Den byggs inte ut. Den slutliga LifeAI
ligger separat och ansluter via LifeOS.
