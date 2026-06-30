// Svensk översättning av Supabase auth-fel
export type AuthErrorKind =
  | "email_not_confirmed"
  | "invalid_credentials"
  | "user_exists"
  | "rate_limit"
  | "expired_link"
  | "weak_password"
  | "network"
  | "oauth"
  | "unknown";

export interface MappedAuthError {
  kind: AuthErrorKind;
  message: string;
}

export function mapAuthError(err: unknown): MappedAuthError {
  const raw = (err as any)?.message ?? String(err ?? "");
  const code = (err as any)?.code ?? "";
  const status = (err as any)?.status ?? 0;
  const m = raw.toLowerCase();

  if (code === "email_not_confirmed" || m.includes("email not confirmed"))
    return { kind: "email_not_confirmed", message: "Din e-postadress är inte bekräftad ännu." };
  if (m.includes("invalid login") || m.includes("invalid credentials"))
    return { kind: "invalid_credentials", message: "Fel e-post eller lösenord." };
  if (m.includes("already registered") || m.includes("user already"))
    return { kind: "user_exists", message: "Det finns redan ett konto med den e-posten. Logga in istället." };
  if (status === 429 || m.includes("rate limit") || m.includes("too many"))
    return { kind: "rate_limit", message: "Vi har redan skickat ett mail nyligen. Vänta en minut och försök igen." };
  if (m.includes("expired") || m.includes("invalid token") || m.includes("otp_expired"))
    return { kind: "expired_link", message: "Länken är ogiltig eller har gått ut. Skicka en ny." };
  if (m.includes("password") && (m.includes("weak") || m.includes("should be at least") || m.includes("pwned")))
    return { kind: "weak_password", message: "Lösenordet är för svagt. Välj minst 6 tecken och något unikt." };
  if (m.includes("failed to fetch") || m.includes("network") || m.includes("load failed"))
    return { kind: "network", message: "Nätverksproblem. Kolla din anslutning och försök igen." };
  if (m.includes("oauth") || m.includes("provider"))
    return { kind: "oauth", message: "Inloggning med Google misslyckades. Försök igen." };

  return { kind: "unknown", message: raw || "Något gick fel. Kontakta support om det fortsätter." };
}
