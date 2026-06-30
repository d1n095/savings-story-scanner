// Calendar Engine — Svenska helgdagar & namnsdagar (helt lokal, ingen API-kostnad)
// Källa: officiella regler. Påsk via Meeus/Jones/Butcher-algoritmen.

export type SwedishHoliday = {
  date: string; // ISO yyyy-mm-dd
  name: string;
  type: "red" | "flag" | "tradition";
};

function easterSunday(year: number): Date {
  // Anonymous Gregorian algorithm
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const L = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * L) / 451);
  const month = Math.floor((h + L - 7 * m + 114) / 31);
  const day = ((h + L - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d.getTime());
  r.setUTCDate(r.getUTCDate() + days);
  return r;
}

function iso(d: Date): string { return d.toISOString().slice(0, 10); }

function midsommardagen(year: number): Date {
  // Lördagen mellan 20–26 juni
  for (let day = 20; day <= 26; day++) {
    const d = new Date(Date.UTC(year, 5, day));
    if (d.getUTCDay() === 6) return d;
  }
  return new Date(Date.UTC(year, 5, 26));
}

function allaHelgonsDag(year: number): Date {
  // Lördagen 31 okt – 6 nov
  for (let day = 31; day <= 31; day++) {
    const d = new Date(Date.UTC(year, 9, day));
    if (d.getUTCDay() === 6) return d;
  }
  for (let day = 1; day <= 6; day++) {
    const d = new Date(Date.UTC(year, 10, day));
    if (d.getUTCDay() === 6) return d;
  }
  return new Date(Date.UTC(year, 10, 1));
}

export function holidaysForYear(year: number): SwedishHoliday[] {
  const easter = easterSunday(year);
  const list: SwedishHoliday[] = [
    { date: `${year}-01-01`, name: "Nyårsdagen", type: "red" },
    { date: `${year}-01-05`, name: "Trettondagsafton", type: "tradition" },
    { date: `${year}-01-06`, name: "Trettondedag jul", type: "red" },
    { date: iso(addDays(easter, -3)), name: "Skärtorsdagen", type: "tradition" },
    { date: iso(addDays(easter, -2)), name: "Långfredagen", type: "red" },
    { date: iso(addDays(easter, -1)), name: "Påskafton", type: "tradition" },
    { date: iso(easter), name: "Påskdagen", type: "red" },
    { date: iso(addDays(easter, 1)), name: "Annandag påsk", type: "red" },
    { date: `${year}-04-30`, name: "Valborgsmässoafton", type: "tradition" },
    { date: `${year}-05-01`, name: "Första maj", type: "red" },
    { date: iso(addDays(easter, 39)), name: "Kristi himmelsfärdsdag", type: "red" },
    { date: iso(addDays(easter, 49)), name: "Pingstdagen", type: "red" },
    { date: `${year}-06-06`, name: "Sveriges nationaldag", type: "red" },
    { date: iso(addDays(midsommardagen(year), -1)), name: "Midsommarafton", type: "tradition" },
    { date: iso(midsommardagen(year)), name: "Midsommardagen", type: "red" },
    { date: iso(allaHelgonsDag(year)), name: "Alla helgons dag", type: "red" },
    { date: `${year}-12-24`, name: "Julafton", type: "tradition" },
    { date: `${year}-12-25`, name: "Juldagen", type: "red" },
    { date: `${year}-12-26`, name: "Annandag jul", type: "red" },
    { date: `${year}-12-31`, name: "Nyårsafton", type: "tradition" },
  ];
  return list;
}

export function isRedDay(date: Date): SwedishHoliday | undefined {
  const y = date.getFullYear();
  const key = `${y}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return holidaysForYear(y).find((h) => h.date === key && h.type === "red");
}

// Söndag räknas också som "röd" enligt traditionell svensk löneberäkning
export function isHelg(date: Date): boolean {
  const w = date.getDay();
  return w === 0 || !!isRedDay(date);
}
