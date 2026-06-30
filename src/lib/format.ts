export const sek = (n: number) =>
  new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 }).format(n);

export const sekPrecise = (n: number) =>
  new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 2 }).format(n);

export const num = (n: number, digits = 0) =>
  new Intl.NumberFormat("sv-SE", { maximumFractionDigits: digits }).format(n);

export const sweDate = (d: Date | string) => {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("sv-SE", { weekday: "short", day: "numeric", month: "short" }).format(date);
};

export const sweTime = (d: Date | string) => {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("sv-SE", { hour: "2-digit", minute: "2-digit" }).format(date);
};
