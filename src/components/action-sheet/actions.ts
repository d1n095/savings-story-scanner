import {
  Briefcase, Phone, Radio, Plane, Stethoscope, Baby, Coffee, Clock, ArrowLeftRight, Upload, Copy,
  Wallet, TrendingUp, Receipt, Repeat, Target, PieChart, Landmark, CreditCard,
  CalendarRange, Map, Bell, Cake, Sparkles, Flag, StickyNote,
  Scale, Dumbbell, UtensilsCrossed, Droplets, Moon, Footprints,
  FileText, ScanLine, FileImage, ShieldCheck, FileSignature,
  type LucideIcon,
} from "lucide-react";

export type ActionCategory = "jobba" | "pengar" | "planera" | "halsa" | "dokument";
export type Action = {
  key: string;
  label: string;
  category: ActionCategory;
  icon: LucideIcon;
  /** Om null/undefined → öppnar inline-flow i ActionSheet. Annars navigerar till route. */
  route?: string;
  routeSearch?: Record<string, string>;
};

export const CATEGORY_META: Record<ActionCategory, { label: string; emoji: string; tint: string }> = {
  jobba:    { label: "Jobba",    emoji: "💼", tint: "oklch(0.85 0.12 85)" },
  pengar:   { label: "Pengar",   emoji: "💰", tint: "oklch(0.78 0.14 145)" },
  planera:  { label: "Planera",  emoji: "📅", tint: "oklch(0.75 0.13 240)" },
  halsa:    { label: "Hälsa",    emoji: "🏃", tint: "oklch(0.78 0.14 25)" },
  dokument: { label: "Dokument", emoji: "📄", tint: "oklch(0.78 0.05 260)" },
};

export const ACTIONS: Action[] = [
  // JOBBA
  { key: "shift",        label: "Lägg pass",        category: "jobba", icon: Briefcase },
  { key: "shift.multi",  label: "Flera pass",       category: "jobba", icon: Copy,         route: "/planering" },
  { key: "oncall",       label: "Jour",             category: "jobba", icon: Phone },
  { key: "standby",      label: "Beredskap",        category: "jobba", icon: Radio },
  { key: "vacation",     label: "Semester",         category: "jobba", icon: Plane },
  { key: "sick",         label: "Sjuk",             category: "jobba", icon: Stethoscope },
  { key: "vab",          label: "VAB",              category: "jobba", icon: Baby },
  { key: "leave",        label: "Ledigt",           category: "jobba", icon: Coffee },
  { key: "overtime",     label: "Övertid",          category: "jobba", icon: Clock },
  { key: "swap",         label: "Byt pass",         category: "jobba", icon: ArrowLeftRight, route: "/jobb" },
  { key: "import",       label: "Importera schema", category: "jobba", icon: Upload,       route: "/importera" },
  { key: "copyWeek",     label: "Kopiera vecka",    category: "jobba", icon: Copy,         route: "/planering" },

  // PENGAR
  { key: "expense",      label: "Lägg utgift",      category: "pengar", icon: Wallet },
  { key: "income",       label: "Lägg inkomst",     category: "pengar", icon: TrendingUp,   route: "/pengar", routeSearch: { add: "income" } },
  { key: "bill",         label: "Räkning",          category: "pengar", icon: Receipt,      route: "/pengar", routeSearch: { add: "bill" } },
  { key: "subscription", label: "Abonnemang",       category: "pengar", icon: Repeat,       route: "/pengar", routeSearch: { add: "subscription" } },
  { key: "saving",       label: "Sparmål",          category: "pengar", icon: Target,       route: "/pengar", routeSearch: { add: "saving" } },
  { key: "budget",       label: "Budget",           category: "pengar", icon: PieChart,     route: "/pengar", routeSearch: { add: "budget" } },
  { key: "loan",         label: "Lån",              category: "pengar", icon: Landmark,     route: "/pengar", routeSearch: { add: "loan" } },
  { key: "debt",         label: "Skuld",            category: "pengar", icon: CreditCard,   route: "/pengar", routeSearch: { add: "debt" } },

  // PLANERA
  { key: "plan.vacation",label: "Semesterplan",     category: "planera", icon: Plane,       route: "/planering" },
  { key: "trip",         label: "Resa",             category: "planera", icon: Map,         route: "/kalender" },
  { key: "reminder",     label: "Påminnelse",       category: "planera", icon: Bell },
  { key: "birthday",     label: "Födelsedag",       category: "planera", icon: Cake,        route: "/kalender" },
  { key: "nameday",      label: "Namnsdag",         category: "planera", icon: Sparkles,    route: "/kalender" },
  { key: "goal",         label: "Mål",              category: "planera", icon: Flag,        route: "/kalender" },
  { key: "note",         label: "Anteckning",       category: "planera", icon: StickyNote,  route: "/kalender" },

  // HÄLSA (kommande vågor — länkar till kalender tills vidare)
  { key: "weight",       label: "Vikt",             category: "halsa", icon: Scale,            route: "/kalender" },
  { key: "workout",      label: "Träning",          category: "halsa", icon: Dumbbell,         route: "/kalender" },
  { key: "meal",         label: "Mat",              category: "halsa", icon: UtensilsCrossed,  route: "/kalender" },
  { key: "water",        label: "Vatten",           category: "halsa", icon: Droplets,         route: "/kalender" },
  { key: "sleep",        label: "Sömn",             category: "halsa", icon: Moon,             route: "/kalender" },
  { key: "walk",         label: "Promenad",         category: "halsa", icon: Footprints,       route: "/kalender" },

  // DOKUMENT
  { key: "scan",         label: "Scanna",           category: "dokument", icon: ScanLine,    route: "/kalender" },
  { key: "doc.import",   label: "Importera",        category: "dokument", icon: Upload,      route: "/kalender" },
  { key: "receipt",      label: "Kvitto",           category: "dokument", icon: FileImage,   route: "/kalender" },
  { key: "warranty",     label: "Garanti",          category: "dokument", icon: ShieldCheck, route: "/kalender" },
  { key: "insurance",    label: "Försäkring",       category: "dokument", icon: FileText,    route: "/kalender" },
  { key: "contract",     label: "Kontrakt",         category: "dokument", icon: FileSignature,route: "/kalender" },
];

export function actionsByCategory(cat: ActionCategory) {
  return ACTIONS.filter((a) => a.category === cat);
}
