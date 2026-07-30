import { createFileRoute } from "@tanstack/react-router";
import { PlanningView } from "@/modules/planning";

// Tunn adapter: routen deklareras här, all logik ligger i modulen.
export const Route = createFileRoute("/_app/planering")({ component: PlaneringRoute });

function PlaneringRoute() {
  return <PlanningView />;
}
