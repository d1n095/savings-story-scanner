import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  disableModule,
  enableModule,
  installModule,
  listAudit,
  listModuleViews,
  uninstallModule,
} from "@/services/module-service";

export const MODULES_QUERY_KEY = ["modules", "installations"] as const;

export function useModuleViews() {
  return useQuery({
    queryKey: MODULES_QUERY_KEY,
    queryFn: async () => {
      const result = await listModuleViews();
      if (!result.ok) throw new Error(result.message);
      return result.value;
    },
    staleTime: 30_000,
  });
}

export function useModuleAudit(limit = 12) {
  return useQuery({
    queryKey: ["modules", "audit", limit],
    queryFn: async () => {
      const result = await listAudit(limit);
      if (!result.ok) throw new Error(result.message);
      return result.value;
    },
    staleTime: 30_000,
  });
}

type Action = "install" | "enable" | "disable" | "uninstall";

const runners: Record<Action, (id: string) => Promise<{ ok: boolean; message?: string }>> = {
  install: (id) => installModule(id),
  enable: (id) => enableModule(id),
  disable: (id) => disableModule(id),
  uninstall: (id) => uninstallModule(id),
};

const successText: Record<Action, string> = {
  install: "installerad",
  enable: "aktiverad",
  disable: "inaktiverad",
  uninstall: "avinstallerad",
};

export function useModuleAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ action, moduleId }: { action: Action; moduleId: string }) => {
      const result = await runners[action](moduleId);
      // Visa aldrig lyckat om persistensen misslyckades.
      if (!result.ok) throw new Error(result.message ?? "Åtgärden misslyckades.");
      return { action, moduleId };
    },
    onSuccess: ({ action, moduleId }) => {
      toast.success(`Modulen är ${successText[action]}.`, { description: moduleId });
      void qc.invalidateQueries({ queryKey: ["modules"] });
    },
    onError: (error: Error) => {
      toast.error("Åtgärden gick inte att genomföra", { description: error.message });
    },
  });
}
