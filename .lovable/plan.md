# Action-First Architecture — "Vad vill du göra?"

Vi slutar bygga moduler. Vi bygger handlingar. Användaren ser aldrig "Planering vs Jobb vs Kalender" — bara verb.

## 1. Universal Action Sheet (hjärtat)

En enda komponent: `<ActionSheet />` — öppnas från:
- Stora **+** (FAB) — global
- Tomma states ("Inga pass än → +")
- Snabbtryck på dag i kalendern
- `/` på desktop

Steg 1 — **Vad vill du göra?** (sökbar lista, ikon + verb):
```
💼  Jobba          → Pass, Jour, Beredskap, Semester, Sjuk, VAB, Övertid, Byt, Importera, Kopiera vecka
💰  Pengar         → Utgift, Inkomst, Räkning, Abonnemang, Sparmål, Budget, Lån, Skuld
📅  Planera        → Semester, Resa, Påminnelse, Födelsedag, Namnsdag, Mål, Anteckning
🏃  Hälsa          → Vikt, Träning, Mat, Vatten, Sömn, Promenad
📄  Dokument       → Scanna, Importera, Kvitto, Garanti, Försäkring, Kontrakt
```

Steg 2 — **Smart mini-flow** per handling. Ingen full form. Bara det som krävs.
Exempel "Lägg pass":
```
Vilket pass?
[ Dagpass 07–16 ]  ← din standard, ett tryck = klart
[ Kvällspass ]
[ Eget tid ]
```
→ Toast "Pass sparat • Tryck för detaljer"

## 2. Smart Defaults Engine

Ny tabell `user_defaults` (key/value/confidence). Skrivs av:
- `learnFromShift()` — kör efter varje sparat pass
- Detekterar: vanligaste starttid, sluttid, rast, arbetsprofil, dag-mönster

Läses av Action Sheet för att förfylla. Top-förslag = standard-knapp.

## 3. Pattern Detection (passiv AI, deterministisk)

Bakgrundsjobb (klientside efter mutation):
- 3 likadana pass → toast "Vill du göra detta till standard?"
- Måndag-fredag i 2 veckor → "Skapa återkommande mall?"
- Samma utgift 2 månader i rad → "Lägg som abonnemang?"

Lagras i `signals` (finns redan). Visas som mjuk banner, aldrig modal.

## 4. Navigation kollapsar

Före: Kalender, Pengar, Insikter, Mer (Planering/Jobb/Dashboard/Inställningar)
Efter:
- **Idag** (default landing — dagens pass, utgifter, påminnelser)
- **Kalender** (vyer för pass/ekonomi/planering på samma yta)
- **Pengar** (översikt utgifter/inkomst)
- **Du** (profil + inställningar + arbetsprofiler)

Allt skapande sker via **+**, inte via navigation. Planering, Jobb och Dashboard som egna sidor försvinner som destinationer.

## 5. Kontextuell yta

Varje sida visar bara aktuell kontext. Inställningar visas aldrig inline — länk "⚙ Justera" öppnar relevant sektion i sheet.

## 6. Tekniskt

**Nya filer:**
- `src/components/action-sheet/` — `ActionSheet.tsx`, `actions.ts` (registry), `flows/` (en fil per verb: `add-shift.tsx`, `add-expense.tsx`, …)
- `src/lib/defaults.ts` — read/write `user_defaults`
- `src/lib/pattern-detector.ts` — kör efter mutationer
- `src/routes/_app/idag.tsx` — ny landing

**Migration:**
```sql
create table public.user_defaults (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  value jsonb not null,
  confidence int not null default 1,
  updated_at timestamptz default now(),
  unique(user_id, key)
);
-- + GRANT + RLS (auth.uid() = user_id)
```

**Ersätter:** `quick-add-sheet.tsx` (gamla FAB), gör om till tunn wrapper runt `ActionSheet`.

**Behåller:** Befintliga routes som destinationer för djupgående redigering — men användaren navigerar dit via klick på objekt, inte via meny.

## 7. Leverans i 3 vågor

**Våg 1 (denna runda):**
- `user_defaults` tabell
- `ActionSheet` skelett + registry
- 4 flows klara: Pass, Utgift, Semester, Påminnelse
- Ny `/idag` + uppdaterad sidebar
- Defaults engine för pass

**Våg 2:**
- Resterande Jobba-flows (Jour, Beredskap, Sjuk, VAB, Övertid, Byt, Importera, Kopiera vecka)
- Pengar-flows komplett
- Pattern detection live

**Våg 3:**
- Hälsa + Dokument-flows (kräver nya tabeller — bekräftas innan)
- Smart förslag-bannrar
- `/` keyboard launcher

---

**Bekräfta så kör jag Våg 1 direkt.** Vill du ändra något i verb-listan, eller lägga till/ta bort handlingar innan jag börjar?
