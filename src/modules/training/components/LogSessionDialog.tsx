// =====================================================================
// src/modules/training/components/LogSessionDialog.tsx
// Logga ett genomfört pass: från mall, från ett planerat pass eller
// helt fritt. Sparar först — visar aldrig lyckat i förväg.
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
import { Textarea } from "@/components/ui/textarea";
import { completeSession, logAdHocSession } from "../service";
import { useTrainingMutation, useTrainingTemplates } from "../hooks";
import { isoDate } from "../summary";
import type { SessionDetail } from "../types";
import {
  ExerciseLogEditor,
  draftFromSession,
  draftFromTemplate,
  emptyExercise,
  toLoggedExercises,
  type DraftExercise,
} from "./ExerciseLogEditor";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Om satt loggas detta planerade pass som genomfört. */
  session?: SessionDetail | null;
}

export function LogSessionDialog({ open, onOpenChange, session }: Props) {
  const templates = useTrainingTemplates();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(isoDate(new Date()));
  const [duration, setDuration] = useState("");
  const [effort, setEffort] = useState("");
  const [notes, setNotes] = useState("");
  const [templateId, setTemplateId] = useState<string>("none");
  const [draft, setDraft] = useState<DraftExercise[]>([emptyExercise()]);

  useEffect(() => {
    if (!open) return;
    if (session) {
      setTitle(session.title);
      setDate(session.scheduledOn);
      setDuration(session.durationMin ? String(session.durationMin) : "");
      setEffort(session.perceivedEffort ? String(session.perceivedEffort) : "");
      setNotes(session.notes ?? "");
      setTemplateId(session.templateId ?? "none");
      const fromSession = draftFromSession(session.exercises);
      const template = templates.data?.find((t) => t.id === session.templateId);
      setDraft(
        fromSession.length > 0
          ? fromSession
          : template
            ? draftFromTemplate(template)
            : [emptyExercise()],
      );
    } else {
      setTitle("");
      setDate(isoDate(new Date()));
      setDuration("");
      setEffort("");
      setNotes("");
      setTemplateId("none");
      setDraft([emptyExercise()]);
    }
  }, [open, session, templates.data]);

  function applyTemplate(id: string) {
    setTemplateId(id);
    const template = templates.data?.find((t) => t.id === id);
    if (!template) return;
    if (!title.trim()) setTitle(template.name);
    setDraft(draftFromTemplate(template));
  }

  const save = useTrainingMutation(async () => {
    const exercises = toLoggedExercises(draft);
    const durationMin = duration.trim() ? Number(duration.replace(",", ".")) : null;
    const perceivedEffort = effort.trim() ? Number(effort) : null;

    if (session)
      return completeSession(session.id, {
        durationMin,
        perceivedEffort,
        notes,
        exercises,
      });

    return logAdHocSession({
      title,
      scheduledOn: date,
      templateId: templateId === "none" ? null : templateId,
      durationMin,
      perceivedEffort,
      notes,
      exercises,
    });
  }, "Passet är loggat.");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{session ? "Logga planerat pass" : "Logga pass"}</DialogTitle>
          <DialogDescription>
            Fyll i vad du faktiskt gjorde. Passet sparas först när databasen bekräftat.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="log-title">Titel</Label>
              <Input
                id="log-title"
                value={title}
                disabled={!!session}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="t.ex. Underkropp"
              />
            </div>
            <div>
              <Label htmlFor="log-date">Datum</Label>
              <Input
                id="log-date"
                type="date"
                value={date}
                disabled={!!session}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          {!session && (
            <div>
              <Label htmlFor="log-template">Utgå från mall</Label>
              <Select value={templateId} onValueChange={applyTemplate}>
                <SelectTrigger id="log-template">
                  <SelectValue placeholder="Ingen mall" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ingen mall (fritt pass)</SelectItem>
                  {(templates.data ?? []).map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <ExerciseLogEditor value={draft} onChange={setDraft} disabled={save.isPending} />

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="log-duration">Total tid (min)</Label>
              <Input
                id="log-duration"
                inputMode="decimal"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="log-effort">Upplevd ansträngning (1–10)</Label>
              <Input
                id="log-effort"
                inputMode="numeric"
                value={effort}
                onChange={(e) => setEffort(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="log-notes">Anteckning</Label>
            <Textarea
              id="log-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Hur kändes passet?"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={save.isPending}>
            Avbryt
          </Button>
          <Button
            onClick={() =>
              save.mutate(undefined, {
                onSuccess: () => onOpenChange(false),
              })
            }
            disabled={save.isPending}
          >
            {save.isPending ? "Sparar…" : "Spara passet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
