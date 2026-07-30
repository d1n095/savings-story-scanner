// =====================================================================
// src/modules/catalog.ts
// Modullagrets katalog: plattformens kärnmanifest + moduler som äger sitt
// eget manifest. Beroendet går alltid moduler → plattform, aldrig omvänt.
// REN DATA.
// =====================================================================

import { corePreinstalledModules, upcomingModules } from "@/platform/module-catalog";
import type { LifeModuleManifest } from "@/platform/module-sdk";
import { planningModule } from "./planning/module";

/** Moduler som följer med LifeApp idag. */
export const preinstalledModules: LifeModuleManifest[] = [
  ...corePreinstalledModules,
  planningModule,
];

export const lifeStoreCatalog: LifeModuleManifest[] = [...preinstalledModules, ...upcomingModules];
