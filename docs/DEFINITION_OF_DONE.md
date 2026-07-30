# Definition of Done

**Status:** Normativ · **Skapad:** 2026-07-30 · **Styrande:** [/AGENTS.md](../AGENTS.md)

En milstolpe är klar först när **alla tillämpliga** grindar nedan är passerade och
bevisade. Grönt typecheck är inte klart. Grönt testsvit är inte klart.
Om en grind inte är tillämplig ska det skrivas ut varför.

## 1. Frontend
- [ ] Empty, loading, success, valideringsfel, behörighetsfel, nätverksfel visas
- [ ] Svenska i all användartext; engelska i kod
- [ ] Semantiska designtoken — inga hårdkodade färgklasser
- [ ] Fungerar på mobil (≤480 px) och desktop (≥1280 px)
- [ ] Inga nya console-fel eller misslyckade nätverksanrop

## 2. Backend / serverlogik
- [ ] Server-side validering (zod) på all inkommande data
- [ ] Auktorisering verkställd på servern, aldrig enbart i UI
- [ ] Inga hemligheter i klientgrafen; `process.env` läses inuti handlern
- [ ] Fel returneras strukturerat, inte svalda

## 3. Databas
- [ ] Migration är additiv eller uttryckligen versionerad
- [ ] `GRANT` finns för varje ny publik tabell
- [ ] RLS påslagen med policyer som faktiskt begränsar till ägaren
- [ ] Ingen destruktiv operation utan uttryckligt godkännande
- [ ] Befintlig lön-, pass-, kalender-, ekonomi- och scannerdata orörd

## 4. Säkerhet
- [ ] Annan inloggad användare kan varken läsa eller ändra första användarens data
- [ ] Ogiltiga och obehöriga anrop avvisas med korrekt statuskod
- [ ] Inga nya beroenden med kända sårbarheter
- [ ] Security-vyn uppdaterad efter större kod-, beroende- eller databasändringar

## 5. Test
- [ ] `bun run test` grönt
- [ ] `bun run lint` grönt
- [ ] `bun run build` grönt
- [ ] Nya enhetstester för ny domänlogik
- [ ] Integrationstest eller verifierat anrop för ny serverlogik
- [ ] Regressionskontroll av angränsande flöden

## 6. Verifiering i webbläsare
- [ ] Hela användarflödet genomfört, inte bara knappklick
- [ ] Data kvarstår efter omladdning
- [ ] Desktop och mobil
- [ ] Konsol och nätverk inspekterade

## 7. Tillgänglighet
- [ ] Tangentbordsnavigering fungerar
- [ ] Fokusmarkering synlig
- [ ] Formulärfält har etiketter; ikonknappar har `aria-label`
- [ ] Kontrast rimlig mot mörk bakgrund

## 8. Dokumentation och diff
- [ ] [CURRENT_STATE.md](CURRENT_STATE.md) uppdaterad
- [ ] [REQUIREMENTS_TRACEABILITY.md](REQUIREMENTS_TRACEABILITY.md) uppdaterad
- [ ] Arkitekturbeslut infört i [DECISIONS.md](DECISIONS.md)
- [ ] Slutlig diff granskad — inga orelaterade ändringar
