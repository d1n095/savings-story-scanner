// =====================================================================
// src/modules/training/module.ts
// Träningsmodulens manifest. REN DATA: ingen I/O, inga UI-importer.
// =====================================================================

import {
  defineLifeModule,
  LIFEAPP_API_VERSION,
  type LifeModuleManifest,
} from "@/platform/module-sdk";

export const TRAINING_MODULE_ID = "training" as const;

export const trainingModule: LifeModuleManifest = defineLifeModule({
  id: TRAINING_MODULE_ID,
  name: "Träning",
  version: "1.0.0",
  apiVersion: LIFEAPP_API_VERSION,
  description: "Träningsmallar, planerade pass, loggning och historik.",
  publisher: "LifeApp",
  firstParty: true,
  pricing: { kind: "free" },
  routes: [
    { path: "/traning", label: "Träning", requiresAuth: true, nav: true },
    { path: "/traning/pass", label: "Mallar och planering", requiresAuth: true },
    { path: "/traning/historik", label: "Träningshistorik", requiresAuth: true },
  ],
  capabilities: ["read", "write", "compute", "schedule"],
  permissions: [
    { permission: "training:read", reason: "Visa dina pass, mallar och historik.", required: true },
    {
      permission: "training:write",
      reason: "Skapa mallar, planera pass och logga träning.",
      required: true,
    },
  ],
  // Kalenderintegration sker via publicerade events, inte via hårt beroende.
  dependencies: [],
  eventsPublished: [
    "training.session.scheduled",
    "training.session.rescheduled",
    "training.session.cancelled",
    "training.session.completed",
    "training.session.deleted",
  ],
  eventsConsumed: [],
  commandsSupported: [],
  estimatedStorageKb: 250,
  standalone: { enabled: false },
});
