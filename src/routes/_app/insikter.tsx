import { createFileRoute } from "@tanstack/react-router";
import { InsightsView } from "@/modules/planning";

// Tunn adapter: routen deklareras här, all logik ligger i modulen.
export const Route = createFileRoute("/_app/insikter")({ component: InsikterRoute });

function InsikterRoute() {
  return <InsightsView />;
}
