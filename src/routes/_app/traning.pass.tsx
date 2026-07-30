import { createFileRoute } from "@tanstack/react-router";
import { TrainingPlanView } from "@/modules/training";

export const Route = createFileRoute("/_app/traning/pass")({ component: TraningPassRoute });

function TraningPassRoute() {
  return <TrainingPlanView />;
}
