
# My Money Master — Life OS

Inte en budgetapp. Ett **operativsystem för livet** byggt på en kedja av samverkande engines, där ekonomi är motorn, kalendern ryggraden, AI hjärnan och tidslinjen huvudvyn.

---

## ENGINE-ARKITEKTUR (din kedja)

```
AI Engine
   ↓
Calendar Engine
   ↓
Salary Engine
   ↓
Finance Engine
   ↓
Health Engine
   ↓
Travel Engine
   ↓
Document Engine
   ↓
Reminder Engine
   ↓
Notification Engine
   ↓
Automation Engine
   ↓
Integration Engine
   ↓
Business Engine
```

Varje engine är en isolerad modul i `src/modules/<engine>/` med egna tabeller (RLS), egna server-functions, egna komponenter och en on/off-flagga. De pratar **bara** via en gemensam event-buss + delad **timeline_events**-tabell i `core/`. Ingen engine importerar en annan direkt → nya engines kan kopplas in utan att röra kärnan.

### Vad varje engine gör

**1. AI Engine** — hjärnan över alla andra. 3 nivåer för låg kostnad:
- Nivå 1 deterministisk (gratis): regler, OB, prediktioner, stats
- Nivå 2 lokal beteendeanalys (gratis): kluster, trender, anomalier, samband
- Nivå 3 Lovable AI Gateway (sparsam): "kan jag köpa X?", naturligt språk, OCR, veckosummering, semesterförslag
Har `ai_memory`-tabell (destillerade fakta) → kompakt kontext, personligt, billigt. Coach-röst (respektfull, aldrig domare).

**2. Calendar Engine** — ryggraden. Svenska helgdagar + **namnsdagar** (lokal algoritm), drag-and-drop pass, källan till alla datum för övriga engines.

**3. Salary Engine** — Sveriges bästa lönemotor. Alla OB-fönster, kollektivavtals-mallar (Kommunal, Handels, Metall, Vård, Bygg, HRF + eget), skatt, övertid, jour, semester, sjuk, VAB, provision, bonus, frilans. Live-räknare, simulering, PDF + Excel.

**4. Finance Engine** — utgifter (naturligt språk + smart kategorisering), återkommande, "kostar i arbetstid", sparmål, skulder, buffert, **Money Score 0–100**, Hidden Money Finder, beslutsmotor ("kan jag köpa X?").

**5. Health Engine** (frivillig) — träning, kost/matplan, viktkurva, kroppsmått, stegmål + **stegräknare via Web Sensors / HealthKit / Google Fit**, vattenintag, sömn, **vecko-/månads-/årsfoton** + före/efter. AI hittar samband ("du tränar mer när du sover bättre").

**6. Travel Engine** — hel resa som tidslinje + karta (MapLibre + OpenStreetMap, gratis). Flyg/tåg/buss/taxi/bil/mellanlandningar/hotell/mat/fika/kiosk/toa/bagage/försäkring/antal personer/väder/budget. **Weather sub-engine:** Open-Meteo (gratis) för resor, träning, schema, semester.

**7. Document Engine** — krypterat valv: kvitton, garantier, avtal, försäkringar, hyreskontrakt, lönespec, ID, fordonspapper, sjukintyg, semesteransökan. **OCR** via AI Engine extraherar datum/belopp/förfallodag/butik/garantidatum/person/kategori → skapar event + påminnelse automatiskt.

**8. Reminder Engine** — central påminnelsemotor. Namnsdagar ("Anna om 7 dagar — lägg påminnelse + presentbudget?"), garantier som löper ut, räkningar, semesteransökningar, personliga datum.

**9. Notification Engine** — beslutar **vad** som visas **var** och **när**. Glaskort på dashboard, push (PWA), in-app toast. Aldrig spam — prioriterad (info/varning/kritisk), tyst-tider, sammanslagning.

**10. Automation Engine** — proaktiv signal-motor. Körs i bakgrunden efter varje event (lön, utgift, schemaändring) → genererar signaler → Notification Engine. Auto-detektering av återkommande, regler, triggers.

**11. Integration Engine** — adaptrar mot omvärlden. **Medvind**, arbetsgivarsystem, kalender, lönesystem. När API saknas: PDF-import, screenshot, CSV, klistra-in, auto-genererat meddelande till chef. **Bank/Open Banking** förberett (Tink/Plaid kan kopplas senare).

**12. Business Engine** — samma motor, multi-user, fakturering, rapporter, F-skatt, moms. Återanvänder Salary + Finance + Document + AI utan ändringar.

---

## TIDSLINJEN (huvudvy — alla engines möts här)

```
↑ FRAMTID
  29 jul · ✈ Spanien-resa börjar · budget 14 200 kr      (Travel)
  25 jul · 💰 Lön +28 430 kr (prognos)                   (Salary)
  20 jul · 🎂 Anna 32 år · presentbudget 400 kr          (Reminder)
  18 jul · ⚠ TV-garanti löper ut                         (Document)
  16 jul · 🏃 Löpning 5 km (regn 12mm – flytta?)         (Health + Weather)
  ─── IDAG ───
  14 jul · 🍕 Pizza 129 kr                               (Finance)
  12 jul · 💼 Pass 07–16 · +1 847 kr                     (Calendar + Salary)
  10 jul · 💪 Gym + sömn 7h 40m                          (Health)
↓ DÅTID
  📸 Nyår 2027 · minne
```

Varje engine skriver till `timeline_events`. En vy. Filtrerbar per engine.

---

## NATURLIGT SPRÅK + Cmd/Ctrl+K (Zero Form)
En inputrad överallt. Nivå 1-parser klarar 80 %, resten → AI Engine med strikt JSON. Bekräftelsekort + ångra.
- "köpte pizza 129" → Finance
- "pass fredag 07–16" → Calendar + Salary
- "tränade 45 min löpning" → Health
- "Anna namnsdag påminn 1v innan" → Reminder
- "resa Spanien 12–19 juli" → Travel öppnas med skelett

---

## DESIGN — 2030, privatjet × konstgalleri × Apple × sci-fi
Dark default: `#0A0D12` bas, `#11151C` ytor, `#1B2230` förhöjda · champagne-guld `#C9A84C` · pärlvit `#F4F1EA` · smaragd `#1F6F5C` · dämpad korall `#C46A5A`. *Instrument Serif* för siffror, *Inter* för UI. Glasmorfism, guld-hairlines, kornig textur, Motion <250 ms, haptik. **En primär handling per skärm.** Mobil först, PWA, biometri.

## TEKNIK
TanStack Start + React 19 + Tailwind v4 + shadcn/ui + Motion + Recharts + date-fns + Zod · Lovable Cloud (Postgres, Auth, Storage, RLS) + Lovable AI Gateway (Gemini Flash, multimodal OCR) · MapLibre + OpenStreetMap · Open-Meteo · Web Crypto + WebAuthn/Passkeys.

## SIDOR
```
/                      Landning
/auth · /reset-password
/_authenticated/
  /                    Tidslinje + Money Score
  /pengar              Salary + Finance
  /kalender            Calendar + Reminder
  /jobb                Pass + semesterplanerare + Integration
  /halsa               Health Engine
  /minnen              Livsdagbok + årsöversikt
  /dokument            Document Engine + scan
  /resor               Travel Engine + karta
  /insikter            AI Engine, Hidden Money, prediktioner
  /installningar       Profil, säkerhet, OB-regler, engines på/av
```

---

## RUNDOR

**Runda 1 — Kärna + 4 första engines**
Identity & säkerhet, `core/` (timeline + signaler + AI-minne), **AI Engine v1**, **Calendar Engine** (helgdagar + namnsdagar), **Salary Engine** (full OB + simulering), **Finance Engine v1** (utgifter, naturligt språk, Money Score), **Reminder Engine v1**, **Notification Engine v1**, **Automation Engine v1** (signal-motorn).

**Runda 2 — Liv runt motorn**
**Document Engine + OCR**, **Health Engine** (träning, vikt, sömn, foton, samband), **Travel Engine + Weather + karta**, Finance: Hidden Money + beslutsmotor + prediktioner, semesterplanerare.

**Runda 3 — Integrationer + skala**
**Integration Engine** (Medvind PDF/CSV/screenshot + API där möjligt + bank-förberedelse), Minnen & livsdagbok + årsöversikt, gamification (prestige), hushåll/split, PWA + offline + push, **Business Engine v1**.

---

Tryck **Implement plan** så börjar jag Runda 1.
