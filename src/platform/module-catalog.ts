// =====================================================================
// src/platform/module-catalog.ts
// Life Store-katalogen. REN DATA — inga anrop, inga priser som dras,
// ingen installation sker här. Beskriver bara vad som finns.
// Förstapartsmodulerna speglar det som redan finns i LifeApp idag;
// inget av det flyttas eller stängs av i detta steg.
// =====================================================================

import { defineLifeModule, LIFEAPP_API_VERSION, type LifeModuleManifest } from "./module-sdk";

const api = LIFEAPP_API_VERSION;

export const calendarModule = defineLifeModule({
  id: "calendar",
  name: "Kalender",
  version: "1.0.0",
  apiVersion: api,
  description: "Dag, vecka och månad. Pass, påminnelser, helgdagar och namnsdagar.",
  publisher: "LifeApp",
  firstParty: true,
  pricing: { kind: "first-party" },
  routes: [
    { path: "/kalender", label: "Kalender", requiresAuth: true, nav: true },
    { path: "/idag", label: "Idag", requiresAuth: true, nav: true },
  ],
  capabilities: ["read", "write", "schedule"],
  permissions: [
    { permission: "calendar:read", reason: "Visa dina händelser.", required: true },
    { permission: "calendar:write", reason: "Skapa och ändra händelser.", required: true },
  ],
  dependencies: [],
  eventsPublished: ["calendar.event.created", "calendar.event.updated"],
  eventsConsumed: ["shift.created", "shift.updated"],
  commandsSupported: [],
  estimatedStorageKb: 400,
  standalone: { enabled: false },
});

export const workModule = defineLifeModule({
  id: "work",
  name: "Arbete och lön",
  version: "1.0.0",
  apiVersion: api,
  description: "Pass, jour, OB, raster och löneberäkning.",
  publisher: "LifeApp",
  firstParty: true,
  pricing: { kind: "first-party" },
  routes: [
    { path: "/jobb", label: "Jobb & lön", requiresAuth: true, nav: true },
    { path: "/importera", label: "Importera schema", requiresAuth: true },
  ],
  capabilities: ["read", "write", "compute", "import"],
  permissions: [
    { permission: "shifts:read", reason: "Läsa dina arbetspass.", required: true },
    { permission: "shifts:write", reason: "Skapa och ändra pass.", required: true },
    { permission: "salary:compute", reason: "Räkna ut lön och OB.", required: true },
  ],
  dependencies: [],
  eventsPublished: ["shift.created", "shift.updated", "salary.computed"],
  eventsConsumed: [],
  commandsSupported: ["shift.create"],
  estimatedStorageKb: 900,
  standalone: { enabled: true, entryPoint: "modules/work/standalone" },
});

export const financeModule = defineLifeModule({
  id: "finance",
  name: "Ekonomi",
  version: "1.0.0",
  apiVersion: api,
  description: "Utgifter, inkomster, kategorier och överblick.",
  publisher: "LifeApp",
  firstParty: true,
  pricing: { kind: "first-party" },
  routes: [{ path: "/pengar", label: "Pengar", requiresAuth: true, nav: true }],
  capabilities: ["read", "write", "compute", "export"],
  permissions: [
    { permission: "finance:read", reason: "Visa din ekonomi.", required: true },
    { permission: "finance:write", reason: "Registrera utgifter och inkomster.", required: true },
  ],
  dependencies: [],
  eventsPublished: ["expense.created", "income.created"],
  eventsConsumed: ["salary.computed"],
  commandsSupported: [],
  estimatedStorageKb: 700,
  standalone: { enabled: true, entryPoint: "modules/finance/standalone" },
});

export const planningModule = defineLifeModule({
  id: "planning",
  name: "Planering",
  version: "1.0.0",
  apiVersion: api,
  description: "Rotationer, semester, skatt och framtidsvyer.",
  publisher: "LifeApp",
  firstParty: true,
  pricing: { kind: "first-party" },
  routes: [
    { path: "/planering", label: "Planering", requiresAuth: true },
    { path: "/insikter", label: "Insikter", requiresAuth: true },
  ],
  capabilities: ["read", "compute", "schedule"],
  permissions: [
    { permission: "planning:read", reason: "Visa planering och prognoser.", required: true },
    { permission: "shifts:read", reason: "Bygga prognoser på dina pass.", required: false },
  ],
  dependencies: [{ moduleId: "work", range: "^1.0.0", optional: true }],
  eventsPublished: [],
  eventsConsumed: ["shift.created", "salary.computed"],
  commandsSupported: [],
  estimatedStorageKb: 120,
  standalone: { enabled: false },
});

/** Moduler som ännu inte är byggda. Visas som "Tillgängliga" i Life Store. */
export const upcomingModules: LifeModuleManifest[] = [
  defineLifeModule({
    id: "health",
    name: "Hälsa",
    version: "0.1.0",
    apiVersion: api,
    description: "Vikt, sömn, mående och vårdkontakter.",
    publisher: "LifeApp",
    firstParty: true,
    pricing: { kind: "free" },
    routes: [{ path: "/halsa", label: "Hälsa", requiresAuth: true, nav: true }],
    capabilities: ["read", "write"],
    permissions: [
      { permission: "health:read", reason: "Visa din hälsodata.", required: true },
      { permission: "health:write", reason: "Registrera mätvärden.", required: true },
    ],
    dependencies: [],
    eventsPublished: ["health.entry.created"],
    eventsConsumed: [],
    commandsSupported: [],
    estimatedStorageKb: 300,
    standalone: { enabled: false },
  }),
  defineLifeModule({
    id: "training",
    name: "Träning",
    version: "0.1.0",
    apiVersion: api,
    description: "Pass, program och progression.",
    publisher: "LifeApp",
    firstParty: true,
    pricing: { kind: "free" },
    routes: [{ path: "/traning", label: "Träning", requiresAuth: true }],
    capabilities: ["read", "write", "schedule"],
    permissions: [
      { permission: "training:read", reason: "Visa dina träningspass.", required: true },
      { permission: "training:write", reason: "Logga träning.", required: true },
      { permission: "calendar:write", reason: "Lägga träningspass i kalendern.", required: false },
    ],
    dependencies: [{ moduleId: "calendar", range: "^1.0.0", optional: true }],
    eventsPublished: ["training.session.created"],
    eventsConsumed: [],
    commandsSupported: [],
    estimatedStorageKb: 250,
    standalone: { enabled: true, entryPoint: "modules/training/standalone" },
  }),
  defineLifeModule({
    id: "home",
    name: "Boende",
    version: "0.1.0",
    apiVersion: api,
    description: "Hem, underhåll, inventarier och försäkring.",
    publisher: "LifeApp",
    firstParty: true,
    pricing: { kind: "free" },
    routes: [{ path: "/boende", label: "Boende", requiresAuth: true }],
    capabilities: ["read", "write", "schedule"],
    permissions: [
      { permission: "home:read", reason: "Visa ditt boende.", required: true },
      { permission: "home:write", reason: "Registrera underhåll och inventarier.", required: true },
    ],
    dependencies: [],
    eventsPublished: ["home.maintenance.due"],
    eventsConsumed: [],
    commandsSupported: [],
    estimatedStorageKb: 500,
    standalone: { enabled: false },
  }),
  defineLifeModule({
    id: "shopping",
    name: "Shopping",
    version: "0.1.0",
    apiVersion: api,
    description: "Inköpslistor, prisjämförelser och kvitton.",
    publisher: "LifeApp",
    firstParty: true,
    pricing: { kind: "free" },
    routes: [{ path: "/shopping", label: "Shopping", requiresAuth: true }],
    capabilities: ["read", "write"],
    permissions: [
      { permission: "shopping:read", reason: "Visa dina listor.", required: true },
      { permission: "shopping:write", reason: "Ändra listor.", required: true },
      { permission: "finance:write", reason: "Bokföra inköp som utgift.", required: false },
    ],
    dependencies: [{ moduleId: "finance", range: "^1.0.0", optional: true }],
    eventsPublished: ["shopping.item.purchased"],
    eventsConsumed: [],
    commandsSupported: [],
    estimatedStorageKb: 150,
    standalone: { enabled: true, entryPoint: "modules/shopping/standalone" },
  }),
  defineLifeModule({
    id: "commerce",
    name: "Företag och butik",
    version: "0.1.0",
    apiVersion: api,
    description:
      "Samma butikskärna i tre skal: företagssektion i LifeApp, installerad modul eller fristående butiksapp.",
    publisher: "LifeApp",
    firstParty: true,
    pricing: { kind: "paid", priceSek: 99, billing: "monthly" },
    routes: [{ path: "/foretag", label: "Företag", requiresAuth: true }],
    capabilities: ["read", "write", "compute", "export"],
    permissions: [
      { permission: "commerce:read", reason: "Visa produkter och order.", required: true },
      { permission: "commerce:write", reason: "Hantera produkter och order.", required: true },
      { permission: "finance:read", reason: "Koppla försäljning till din ekonomi.", required: false },
    ],
    dependencies: [{ moduleId: "finance", range: "^1.0.0", optional: true }],
    eventsPublished: ["commerce.order.created", "commerce.product.updated"],
    eventsConsumed: [],
    commandsSupported: [],
    estimatedStorageKb: 2000,
    standalone: { enabled: true, entryPoint: "modules/commerce/standalone" },
  }),
  defineLifeModule({
    id: "recipes",
    name: "Recept",
    version: "0.1.0",
    apiVersion: api,
    description: "Recept, veckomeny och inköpslista.",
    publisher: "LifeApp",
    firstParty: true,
    pricing: { kind: "free" },
    routes: [{ path: "/recept", label: "Recept", requiresAuth: true }],
    capabilities: ["read", "write", "schedule"],
    permissions: [
      { permission: "recipes:read", reason: "Visa dina recept.", required: true },
      { permission: "recipes:write", reason: "Spara recept och menyer.", required: true },
      { permission: "shopping:write", reason: "Skicka ingredienser till inköpslistan.", required: false },
    ],
    dependencies: [{ moduleId: "shopping", range: "^0.1.0", optional: true }],
    eventsPublished: ["recipes.menu.planned"],
    eventsConsumed: [],
    commandsSupported: [],
    estimatedStorageKb: 200,
    standalone: { enabled: false },
  }),
];

/** Moduler som följer med LifeApp idag. */
export const preinstalledModules: LifeModuleManifest[] = [
  calendarModule,
  workModule,
  financeModule,
  planningModule,
];

export const lifeStoreCatalog: LifeModuleManifest[] = [
  ...preinstalledModules,
  ...upcomingModules,
];
