## Mål
Stabilt auth-flöde där du aldrig fastnar. Tydliga svenska texter, snygga states, korrekt resend och reset, och rätt dev-inställning för Lovable preview.

## Rekommendation för dev-läge
**Alternativ A — auto-confirm PÅ under utveckling.** I Lovable preview kan vi inte garantera SMTP-leverans till Proton/Gmail på sekunder, och du måste kunna iterera utan att fastna. Vi aktiverar auto-confirm nu så att signup → direkt inloggad. Hela bekräftelse-/resend-/reset-flödet byggs ändå färdigt, och inför skarp lansering stänger vi av auto-confirm + kopplar egna mallar.

Vill du istället behålla bekräftelse även i dev säger du bara till så hoppar vi över auto-confirm-steget — allt UI fungerar lika bra.

## Vad jag gör

### 1. Supabase Auth-konfiguration
- Aktivera `auto_confirm_email = true` (dev). Behåller `disable_signup=false`, `external_anonymous_users_enabled=false`, `password_hibp_enabled=true`.
- Säkerställ Google-provider via `configure_social_auth` (om inte redan aktiv).
- Site URL/Redirect URLs hanteras av Lovable Cloud — inget manuellt steg krävs för preview-domänen.

### 2. Auth-sidor (nya/uppdaterade routes)
- `/auth` — login + signup (uppdaterad med svensk felhantering + "skicka bekräftelse igen"-knapp som visas vid `email_not_confirmed`).
- `/auth/check-email` — "Kolla din mail"-skärm efter signup när bekräftelse krävs. Knappar: Skicka igen · Jag har bekräftat · Ändra e-post · Tillbaka till login.
- `/auth/forgot-password` — be om e-post → `resetPasswordForEmail` med `redirectTo: ${origin}/auth/reset-password`.
- `/auth/reset-password` — publik route, läser `type=recovery` från hash, sätter nytt lösenord via `updateUser`.
- `/auth/callback` — publik route som tar emot OAuth/magic link, väntar på session, redirectar till sparad destination eller `/dashboard`.
- `/auth/confirmed` — success-sida efter klick i bekräftelsemail.

### 3. Felöversättning (svenska, mänskliga)
En liten `mapAuthError(err)`-hjälpare som översätter:
- `Email not confirmed` → "Din e-postadress är inte bekräftad ännu." + actions
- `Invalid login credentials` → "Fel e-post eller lösenord."
- `User already registered` → "Det finns redan ett konto med den e-posten. Logga in istället."
- `Email rate limit exceeded` → "Vi har redan skickat ett mail nyligen. Vänta en minut och försök igen."
- `Token has expired or is invalid` → "Länken är ogiltig eller har gått ut. Skicka en ny."
- `Password should be at least…` → "Lösenordet är för svagt. Minst 6 tecken."
- `Failed to fetch` / nätverk → "Nätverksproblem. Kolla din anslutning och försök igen."
- OAuth-fel → "Inloggning med Google misslyckades. Försök igen."
- Fallback → vänlig generisk text + "Kontakta support".

### 4. Resend confirmation
`supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: ${origin}/auth/confirmed } })` med toast + cooldown (60s) för att undvika rate limit.

### 5. Session & skydd
- `_app`-layouten behåller redirect till `/auth` om ingen session.
- `__root.tsx` får en `onAuthStateChange`-listener som invaliderar router endast på `SIGNED_IN/SIGNED_OUT/USER_UPDATED`.
- Profil skapas redan via `handle_new_user`-trigger — kvarstår. Lägger till en defensiv "skapa profil om saknas"-upsert vid första `/dashboard`-laddning så gamla konton inte fastnar utan rad.

### 6. Mailmallar (förberedelse, inte aktivering)
Lägger en `MAIL_TEMPLATES.md` med svenska utkast för: Bekräfta e-post, Återställ lösenord, Magic link, Välkommen. Ton: premium/mörk/lugn. Aktiveras när du kopplar egen domän via Lovable Emails inför launch.

### 7. Säkerhet
- RLS oförändrat. Inga policies öppnas.
- HIBP-skydd på lösenord aktiveras.
- Reset-password-routen är medvetet publik (krav från Supabase recovery-flöde).

## Filer som rörs
- `supabase--configure_auth` (auto-confirm på)
- `src/routes/auth.tsx` (uppdaterad)
- `src/routes/auth.check-email.tsx`, `auth.forgot-password.tsx`, `auth.reset-password.tsx`, `auth.callback.tsx`, `auth.confirmed.tsx` (nya)
- `src/lib/auth-errors.ts` (ny — svensk felmappning + resend helper)
- `src/routes/__root.tsx` (onAuthStateChange-listener)
- `MAIL_TEMPLATES.md` (ny — utkast inför launch)

## Vad du gör efteråt
1. Skapa nytt konto → blir direkt inloggad på `/dashboard` (auto-confirm i dev).
2. Testa "Glömt lösenord" → mail kommer (Supabase default), klicka, sätt nytt.
3. Testa Google-login.
4. När vi närmar oss launch: säg till så stänger jag auto-confirm och scaffoldar Lovable Emails med dina svenska mallar + egen domän.

Tryck **Implement plan** så kör jag.