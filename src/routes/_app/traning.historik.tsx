import { createFileRoute } from "@tanstack/react-router";
import { TrainingHistoryView } from "@/modules/training";

export const Route = createFileRoute("/_app/traning/historik")({
  component: TraningHistorikRoute,
});

function TraningHistorikRoute() {
  return <TrainingHistoryView />;
}
