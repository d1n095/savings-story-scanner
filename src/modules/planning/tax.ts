// Skatt — schablon. Användaren kan justera i Inställningar.
// Profil-fältet `tax_rate` kan vara antingen procent (30) eller fraktion (0.30).
export function taxFraction(raw: number | null | undefined): number {
  const n = Number(raw ?? 0.3);
  if (!isFinite(n) || n <= 0) return 0.3;
  return n > 1 ? n / 100 : n;
}

export function net(gross: number, taxRateRaw: number | null | undefined): number {
  return gross * (1 - taxFraction(taxRateRaw));
}
