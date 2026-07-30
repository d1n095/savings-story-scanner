# Träningsmodulen

Förstapartsmodul, valfri, installerbar via Life Store.

**Modul-ID:** `training` · **Routes:** `/traning`, `/traning/pass`, `/traning/historik`

## Ansvar

- Träningsmallar med övningar (styrka, kondition, rörlighet, övrigt).
- Planerade pass (schemaläggning, ombokning, avbokning).
- Loggning av genomförda pass med övningar och set.
- Historik med rättning och borttagning.
- Sammanställning: pass, minuter, volym och distans per vecka och totalt.

## Gränser

- Importeras utifrån endast via `src/modules/training/index.ts`.
- Inga importer från `src/routes/**`.
- Ingen kunskap om andra moduler; kalenderintegration sker via events.
- All dataåtkomst går genom `service.ts` (Supabase + RLS per användare).

## Filer

| Fil | Roll |
| --- | --- |
| `module.ts` | Manifest (`defineLifeModule`) |
| `types.ts` | Domäntyper och resultatkontrakt |
| `summary.ts` | Ren beräkningslogik, inga beroenden |
| `events.ts` | Typade eventkuvert som modulen publicerar |
| `service.ts` | Dataåtkomst mot Lovable Cloud |
| `hooks.ts` | React Query-hooks |
| `components/` | Modulens vyer som skalet monterar |
| `__tests__/` | Enhetstester för manifest och domänlogik |
