// Datum/tid-parser för snabbinmatning. Pragmatisk — fångar vanliga svenska skrivsätt.

export const WEEKDAY_TOKENS: Record<string, number> = {
  "sön": 0, "son": 0, "söndag": 0, "sondag": 0,
  "mån": 1, "man": 1, "måndag": 1, "mandag": 1,
  "tis": 2, "tisdag": 2,
  "ons": 3, "onsdag": 3,
  "tor": 4, "tors": 4, "torsdag": 4,
  "fre": 5, "fredag": 5,
  "lör": 6, "lor": 6, "lördag": 6, "lordag": 6,
};

const MONTHS: Record<string, number> = {
  "jan": 0, "januari": 0, "feb": 1, "februari": 1, "mar": 2, "mars": 2,
  "apr": 3, "april": 3, "maj": 4, "jun": 5, "juni": 5, "jul": 6, "juli": 6,
  "aug": 7, "augusti": 7, "sep": 8, "sept": 8, "september": 8,
  "okt": 9, "oktober": 9, "nov": 10, "november": 10, "dec": 11, "december": 11,
};

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Måndag i ISO-vecka N år Y
export function isoWeekMonday(year: number, week: number): Date {
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7; // 1..7 mån..sön
  const mondayWeek1 = new Date(jan4);
  mondayWeek1.setDate(jan4.getDate() - dayOfWeek + 1);
  const target = new Date(mondayWeek1);
  target.setDate(mondayWeek1.getDate() + (week - 1) * 7);
  return target;
}

// Plocka tidsintervall "07-16", "07:00-16:00", "07.00–16.30"
export function extractTimeRange(text: string): { from: string; to: string } | null {
  const m = text.match(/(\d{1,2})(?:[:.](\d{2}))?\s*[-–—]\s*(\d{1,2})(?:[:.](\d{2}))?/);
  if (!m) return null;
  const fh = Math.min(23, +m[1]); const fm = m[2] ? +m[2] : 0;
  const th = Math.min(24, +m[3]); const tm = m[4] ? +m[4] : 0;
  const pad = (n: number) => String(n).padStart(2, "0");
  return { from: `${pad(fh)}:${pad(fm)}`, to: `${pad(th === 24 ? 0 : th)}:${pad(tm)}` };
}

function tokenize(s: string): string[] {
  return s.toLowerCase().replace(/[,.;]/g, " ").split(/\s+/).filter(Boolean);
}

export type QuickCommandResult = {
  dates: string[];
  from?: string;
  to?: string;
  weekNumbers?: number[];
  notes: string[];
};

// Tolkar fri text: "07-16 varje måndag, tisdag och fredag i juli" / "kvällspass 15-22 vecka 28"
export function parseQuickCommand(input: string, year = new Date().getFullYear()): QuickCommandResult {
  const text = input.toLowerCase();
  const notes: string[] = [];
  const time = extractTimeRange(text);
  const tokens = tokenize(text);

  // Veckodagar
  const days = new Set<number>();
  for (const t of tokens) if (t in WEEKDAY_TOKENS) days.add(WEEKDAY_TOKENS[t]);

  // Vecka N (en eller flera "vecka 28", "v28", "v.28-30")
  const weekNumbers: number[] = [];
  const weekRange = text.match(/v(?:ecka)?\.?\s*(\d{1,2})\s*[-–]\s*(\d{1,2})/);
  if (weekRange) {
    for (let w = +weekRange[1]; w <= +weekRange[2]; w++) weekNumbers.push(w);
  } else {
    const weekSingles = [...text.matchAll(/v(?:ecka)?\.?\s*(\d{1,2})\b/g)];
    for (const w of weekSingles) weekNumbers.push(+w[1]);
  }

  // Månad ("i juli", "juli")
  let monthIdx: number | undefined;
  for (const t of tokens) if (t in MONTHS) { monthIdx = MONTHS[t]; break; }

  // Bygg datum
  const dates = new Set<string>();
  const today = new Date(); today.setHours(0, 0, 0, 0);

  if (weekNumbers.length) {
    for (const w of weekNumbers) {
      const monday = isoWeekMonday(year, w);
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday); d.setDate(monday.getDate() + i);
        if (days.size === 0 || days.has(d.getDay())) dates.add(isoDate(d));
      }
    }
  } else if (monthIdx !== undefined) {
    const start = new Date(year, monthIdx, 1);
    const end = new Date(year, monthIdx + 1, 0);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (days.size === 0 || days.has(d.getDay())) dates.add(isoDate(d));
    }
  } else if (days.size) {
    // Nästa 4 veckor framåt
    for (let i = 0; i < 28; i++) {
      const d = new Date(today); d.setDate(today.getDate() + i);
      if (days.has(d.getDay())) dates.add(isoDate(d));
    }
    notes.push("Ingen vecka/månad angiven — använder närmaste 4 veckor.");
  }

  if (!time) notes.push("Ingen tid hittad (t.ex. 07–16).");
  if (dates.size === 0) notes.push("Inga datum kunde härledas.");

  return {
    dates: [...dates].sort(),
    from: time?.from,
    to: time?.to,
    weekNumbers,
    notes,
  };
}

// Klistra in flera rader: en rad = ett datum + ev. tid
// "2025-07-15 14:00-22:00", "15/7 14-22", "Mån 15/7 14-22"
export function parsePastedSchedule(text: string, year = new Date().getFullYear()):
  Array<{ date: string; from?: string; to?: string; raw: string }>
{
  const out: Array<{ date: string; from?: string; to?: string; raw: string }> = [];
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  for (const raw of lines) {
    let date: string | undefined;
    // yyyy-mm-dd
    const iso = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (iso) date = `${iso[1]}-${iso[2]}-${iso[3]}`;
    if (!date) {
      // d/m eller d/m/yyyy eller d/m-yyyy
      const dm = raw.match(/\b(\d{1,2})[\/\.](\d{1,2})(?:[\/\.-](\d{2,4}))?\b/);
      if (dm) {
        const d = +dm[1], m = +dm[2];
        let y = dm[3] ? +dm[3] : year;
        if (y < 100) y += 2000;
        date = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      }
    }
    if (!date) continue;
    const tr = extractTimeRange(raw);
    out.push({ date, from: tr?.from, to: tr?.to, raw });
  }
  return out;
}
