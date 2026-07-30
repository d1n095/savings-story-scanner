// =====================================================================
// src/platform/manifest.ts
// LifeApps eget manifest. REN DATA — läser inga tabeller, importerar
// ingen affärslogik, kör ingen kod vid import utöver objektskapande.
// Uppdateras för hand när en modul tillkommer.
// =====================================================================

import { CONTRACT_VERSION, type AppManifest, type ModuleManifest } from "./contracts";

const unknownHealth = { status: "unknown" as const, checkedAt: "1970-01-01T00:00:00.000Z" };

const modules: ModuleManifest[] = [
  {
    contractVersion: CONTRACT_VERSION,
    id: "work",
    name: "Arbete och lön",
    version: "1.0.0",
    layer: "lifeapp",
    description: "Arbetspass, jour, OB, raster och löneberäkning.",
    capabilities: ["read", "write", "compute", "import"],
    permissions: ["shifts:read", "shifts:write", "salary:read", "salary:compute"],
    routes: [
      { path: "/jobb", label: "Jobb & lön", requiresAuth: true },
      { path: "/importera", label: "Importera schema", requiresAuth: true },
    ],
    events: [
      { name: "shift.created", version: "1.0.0", description: "Ett arbetspass har skapats." },
      { name: "shift.updated", version: "1.0.0", description: "Ett arbetspass har ändrats." },
      { name: "salary.computed", version: "1.0.0", description: "Lön har beräknats för en period." },
    ],
    commands: [
      {
        name: "shift.create",
        version: "1.0.0",
        description: "Skapa ett arbetspass.",
        requiredPermissions: ["shifts:write"],
        requiresApproval: true,
      },
    ],
    dependencies: [],
    health: unknownHealth,
    standalonePackagable: true,
  },
  {
    contractVersion: CONTRACT_VERSION,
    id: "finance",
    name: "Ekonomi",
    version: "1.0.0",
    layer: "lifeapp",
    description: "Utgifter, inkomster och ekonomisk översikt.",
    capabilities: ["read", "write", "compute", "export"],
    permissions: ["finance:read", "finance:write"],
    routes: [{ path: "/pengar", label: "Pengar", requiresAuth: true }],
    events: [
      { name: "expense.created", version: "1.0.0", description: "En utgift har registrerats." },
    ],
    commands: [],
    dependencies: [],
    health: unknownHealth,
    standalonePackagable: true,
  },
  {
    contractVersion: CONTRACT_VERSION,
    id: "calendar",
    name: "Kalender",
    version: "1.0.0",
    layer: "lifeapp",
    description: "Samlad tidslinje för pass, utgifter, påminnelser och frånvaro.",
    capabilities: ["read", "write", "schedule"],
    permissions: ["calendar:read", "calendar:write"],
    routes: [
      { path: "/kalender", label: "Kalender", requiresAuth: true },
      { path: "/idag", label: "Idag", requiresAuth: true },
    ],
    events: [
      { name: "calendar.event.created", version: "1.0.0", description: "En kalenderhändelse har skapats." },
    ],
    commands: [],
    dependencies: [{ moduleId: "work", range: "^1.0.0", optional: true }],
    health: unknownHealth,
    standalonePackagable: false,
  },
  {
    contractVersion: CONTRACT_VERSION,
    id: "planning",
    name: "Planering",
    version: "1.0.0",
    layer: "lifeapp",
    description: "Rotationer, semester, skatt och framtidsvyer.",
    capabilities: ["read", "compute", "schedule"],
    permissions: ["planning:read", "planning:write"],
    routes: [
      { path: "/planering", label: "Planering", requiresAuth: true },
      { path: "/insikter", label: "Insikter", requiresAuth: true },
    ],
    events: [],
    commands: [],
    dependencies: [{ moduleId: "work", range: "^1.0.0", optional: true }],
    health: unknownHealth,
    standalonePackagable: false,
  },
  {
    contractVersion: CONTRACT_VERSION,
    id: "main-ai-prototype",
    name: "MainAI (prototyp)",
    version: "0.1.0",
    layer: "lifeapp",
    description:
      "TILLFÄLLIG PROTOTYP. Ersätts av LifeAI i separat repo. Byggs inte ut, raderas inte.",
    capabilities: ["read"],
    permissions: ["mainai:read"],
    routes: [{ path: "/main-ai", label: "MainAI", requiresAuth: true }],
    events: [],
    commands: [],
    dependencies: [],
    health: unknownHealth,
    standalonePackagable: false,
  },
];

export const lifeAppManifest: AppManifest = {
  contractVersion: CONTRACT_VERSION,
  appId: "lifeapp",
  appName: "LifeApp",
  version: "1.0.0",
  layer: "lifeapp",
  modules,
};
