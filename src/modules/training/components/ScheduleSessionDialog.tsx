// =====================================================================
// src/modules/training/components/ScheduleSessionDialog.tsx
// Planera ett kommande pass, med eller utan mall.
// =====================================================================

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { scheduleSession } from "../service";
import { useTrainingMutation, useTrainingTemplates } from "../hooks";
import { isoDate } from "../summary";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Förvald mall när dialogen öppnas från en mall. */
  defaultTemplateId?: string | null;
}

export function ScheduleSessionDialog({ open, onOpenChange, defaultTemplateId }: Props) {
  const templates = useTrainingTemplates();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(isoDate(new Date()));
  const [time, setTime] = useState("");
  const [templateId, setTemplateId] = useState("none");

  useEffect(() => {
    if (!open) return;
    const preset = defaultTemplateId ?? "none";
    setTemplateId(preset);
    const template = templates.data?.find((t) => t.id === preset);
    setTitle(template?.name ?? "");
    setDate(isoDate(new Date()));
    setTime("");
  }, [open, defaultTemplateId, templates.data]);

  const save = useTrainingMutation(
    async () =>
      scheduleSession({
        templateId: templateId === "none" ? null : templateId,
        title,
        scheduledOn: date,
        scheduledTime: time.trim() ? time : null,
      }),
    "Passet är planerat.",
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Planera pass</DialogTitle>
          <DialogDescription>Lägg in ett pass du tänker göra.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="sch-template">Mall</Label>
            <Select
              value={templateId}
              onValueChange={(v) => {
                setTemplateId(v);
                const t = templates.data?.find((x) => x.id === v);
                if (t && !title.trim()) setTitle(t.name);
              }}
            >
              <SelectTrigger id="sch-template">
                <SelectValue placeholder="Ingen mall" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ingen mall</SelectItem>
                {(templates.data ?? []).map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="sch-title">Titel</Label>
            <Input
              id="sch-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="t.ex. Löpning 5 km"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="sch-date">Datum</Label>
              <Input
                id="sch-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="sch-time">Tid (valfritt)</Label>
              <Input
                id="sch-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={save.isPending}>
            Avbryt
          </Button>
          <Button
            onClick={() => save.mutate(undefined, { onSuccess: () => onOpenChange(false) })}
            disabled={save.isPending}
          >
            {save.isPending ? "Sparar…" : "Planera"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
