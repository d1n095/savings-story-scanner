# Calendar Module

Kalendern är appens nav. Alla andra moduler matar in i samma kalender utan att UI:t måste byggas om.

## Hur du lägger till en ny händelsetyp

1. Lägg till värdet i `timeline_kind`-enumet via migration om det inte redan finns.
2. Lägg till `KIND_META[kind]` i `source.ts` med färg och etikett.
3. Skriv eventet till `timeline_events`:

```ts
await supabase.from("timeline_events").insert({
  user_id, kind: "health",
  title: "Löpning",
  subtitle: "8 km",
  occurs_at: new Date().toISOString(),
  amount: null,
  source_table: "workouts", source_id: workoutId,
});
```

Kalendern plockar upp eventet automatiskt — ingen ändring av `/kalender` krävs.

## Dedikerade tabeller (snabbare frågor)

Pass, utgifter, påminnelser och frånvaro hämtas direkt från sina tabeller (snabbare aggregation). Allt annat går via `timeline_events`.
