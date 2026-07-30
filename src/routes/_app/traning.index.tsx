import { createFileRoute } from "@tanstack/react-router";
import { TrainingOverview } from "@/modules/training";

// Tunn adapter: routen deklareras här, all logik ligger i modulen.
export const Route = createFileRoute("/_app/traning/")({ component: TraningRoute });

function TraningRoute() {
  return <TrainingOverview />;
}
