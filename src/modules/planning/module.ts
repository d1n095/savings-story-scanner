// =====================================================================
// src/modules/planning/module.ts
// Planeringsmodulens manifest — referensimplementationen för en riktig
// Life Module. REN DATA: ingen I/O, inga UI-importer.
// =====================================================================

import {
  defineLifeModule,
  LIFEAPP_API_VERSION,
  type LifeModuleManifest,
} from "@/platform/module-sdk";

export const PLANNING_MODULE_ID = "planning" as const;

export const planningModule: LifeModuleManifest = defineLifeModule({
  id: PLANNING_MODULE_ID,
  name: "Planering",
  version: "1.0.0",
  apiVersion: LIFEAPP_API_VERSION,
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
