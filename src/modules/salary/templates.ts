// Passmallar — standard + DB-sparade
export type ShiftTemplate = {
  id: string;
  name: string;
  starts_time: string; // "HH:MM"
  ends_time: string;   // "HH:MM"
  break_minutes: number;
  hourly_rate?: number | null;
  color?: string | null;
  builtin?: boolean;
};

export const BUILTIN_TEMPLATES: ShiftTemplate[] = [
  { id: "b-dag", name: "Dagpass 08–16", starts_time: "08:00", ends_time: "16:00", break_minutes: 30, color: "oklch(0.78 0.105 85)", builtin: true },
  { id: "b-kvall", name: "Kväll 14–21:30", starts_time: "14:00", ends_time: "21:30", break_minutes: 30, color: "oklch(0.65 0.15 30)", builtin: true },
  { id: "b-natt", name: "Natt 21–07", starts_time: "21:00", ends_time: "07:00", break_minutes: 45, color: "oklch(0.55 0.15 260)", builtin: true },
  { id: "b-helg", name: "Helgpass 09–17", starts_time: "09:00", ends_time: "17:00", break_minutes: 30, color: "oklch(0.6 0.18 145)", builtin: true },
];
