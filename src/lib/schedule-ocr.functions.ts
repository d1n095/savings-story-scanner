import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type ParsedShift = {
  date: string;         // yyyy-mm-dd
  from: string;         // HH:MM
  to: string;           // HH:MM
  shift_type: "regular" | "waking_on_call" | "sleeping_on_call" | "standby";
  break_minutes: number;
  note: string;
  confidence: number;   // 0..1
};

type ParseInput = {
  imageDataUrl: string; // data:image/...;base64,...
  hintYear?: number;
};

export const parseScheduleImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const data = input as ParseInput;
    if (!data?.imageDataUrl || typeof data.imageDataUrl !== "string") throw new Error("Bild saknas");
    if (!data.imageDataUrl.startsWith("data:")) throw new Error("Fel bildformat");
    return data;
  })
  .handler(async ({ data }): Promise<{ shifts: ParsedShift[]; warning?: string }> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY saknas");

    const year = data.hintYear ?? new Date().getFullYear();

    const systemPrompt = `Du är en expert på att läsa arbetsschema på svenska.
Läs bilden och extrahera ALLA arbetspass du ser. Följ dessa regler strikt:
- Datum i format yyyy-mm-dd. Om året inte syns, använd ${year}.
- Tid som HH:MM (24h).
- Om ett pass går över midnatt: sätt "to" till sluttiden (t.ex. 06:00) — inte 30:00.
- shift_type: "regular" för vanligt arbete, "waking_on_call" för vaken jour, "sleeping_on_call" för sovande jour, "standby" för beredskap/jour hemma.
- break_minutes: rast i minuter om det syns, annars 0.
- confidence: 0.0–1.0 hur säker du är på just den raden. Var strikt — under 0.7 om något är oklart.
- note: kort svenskt anteckning (t.ex. "kväll", "sovande jour", "helg") eller tom sträng.
Returnera JSON exakt enligt schemat. Inga extra rader, inga kommentarer.`;

    const body = {
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Läs schemat och extrahera alla pass." },
            { type: "image_url", image_url: { url: data.imageDataUrl } },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "schedule",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["shifts"],
            properties: {
              shifts: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["date", "from", "to", "shift_type", "break_minutes", "note", "confidence"],
                  properties: {
                    date: { type: "string" },
                    from: { type: "string" },
                    to: { type: "string" },
                    shift_type: {
                      type: "string",
                      enum: ["regular", "waking_on_call", "sleeping_on_call", "standby"],
                    },
                    break_minutes: { type: "integer" },
                    note: { type: "string" },
                    confidence: { type: "number" },
                  },
                },
              },
            },
          },
        },
      },
    };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const txt = await res.text();
      if (res.status === 429) throw new Error("För många förfrågningar. Vänta en stund och försök igen.");
      if (res.status === 402) throw new Error("Inga AI-krediter kvar i arbetsytan.");
      throw new Error(`AI-fel [${res.status}]: ${txt.slice(0, 200)}`);
    }

    const json: any = await res.json();
    const content: string = json?.choices?.[0]?.message?.content ?? "{}";
    let parsed: { shifts?: ParsedShift[] } = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("Kunde inte tolka AI-svaret");
    }
    const shifts = Array.isArray(parsed.shifts) ? parsed.shifts : [];
    // Grov validering — filtrera bort uppenbart trasiga rader
    const cleaned = shifts.filter(
      (s) =>
        /^\d{4}-\d{2}-\d{2}$/.test(s.date) &&
        /^\d{2}:\d{2}$/.test(s.from) &&
        /^\d{2}:\d{2}$/.test(s.to),
    );

    return {
      shifts: cleaned,
      warning: cleaned.length === 0 ? "Inga pass hittades i bilden." : undefined,
    };
  });
