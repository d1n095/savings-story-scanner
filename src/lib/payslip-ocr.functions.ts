import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type ParsePayslipInput = {
  imageDataUrl: string;
};

export type ParsedPayslip = {
  period_start: string;
  period_end: string;
  gross_salary: number | null;
  net_salary: number | null;
  tax_amount: number | null;
  ob_amount: number | null;
  on_call_amount: number | null;
  vacation_pay: number | null;
  overtime_amount: number | null;
  total_hours: number | null;
  employer: string | null;
  confidence: number;
  ocr_raw: string;
};

export const parsePayslipImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const data = input as ParsePayslipInput;
    if (!data?.imageDataUrl || typeof data.imageDataUrl !== "string")
      throw new Error("Bild saknas");
    if (!data.imageDataUrl.startsWith("data:")) throw new Error("Fel bildformat");
    return data;
  })
  .handler(async ({ data }): Promise<{ payslip: ParsedPayslip; warning?: string }> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY saknas");

    const systemPrompt = `Du ar en expert pa att lasa svenska lonespecifikationer (lonespec).
Las bilden och extrahera lonedata. Folj dessa regler strikt:
- Datum i format yyyy-mm-dd.
- Belopp i SEK som tal (inga kr-tecken, inga mellanslag), t.ex. 24500.50.
- Om ett falt inte syns: returnera null.
- period_start/period_end: avloningsperioden.
- gross_salary: bruttolön (totalt intjanat inkl OB/tillagg, fore skatt).
- net_salary: nettolön (utbetalt belopp).
- tax_amount: dragit skatt (preliminarskatt).
- ob_amount: OB-tillagg/obekvam arbetstid.
- on_call_amount: jourtillagg / beredskapstillagg.
- vacation_pay: semesterersattning eller semestertillagg.
- overtime_amount: overtidstillagg.
- total_hours: totalt redovisade timmar pa lonespecen.
- employer: arbetsgivarens namn.
- confidence: 0.0-1.0 hur saker du ar pa hela tolkningen.
Returnera JSON exakt enligt schemat.`;

    const body = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: "Las lonespecen och extrahera alla falt." },
            { type: "image_url", image_url: { url: data.imageDataUrl } },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "payslip",
          schema: {
            type: "object",
            required: ["period_start", "period_end", "confidence", "ocr_raw"],
            properties: {
              period_start:    { type: "string" },
              period_end:      { type: "string" },
              gross_salary:    { type: ["number", "null"] },
              net_salary:      { type: ["number", "null"] },
              tax_amount:      { type: ["number", "null"] },
              ob_amount:       { type: ["number", "null"] },
              on_call_amount:  { type: ["number", "null"] },
              vacation_pay:    { type: ["number", "null"] },
              overtime_amount: { type: ["number", "null"] },
              total_hours:     { type: ["number", "null"] },
              employer:        { type: ["string", "null"] },
              confidence:      { type: "number", minimum: 0, maximum: 1 },
              ocr_raw:         { type: "string" },
            },
            additionalProperties: false,
          },
          strict: true,
        },
      },
      max_tokens: 1000,
    };

    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "X-Title": "My Money Master - Payslip OCR",
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`AI-tjansten svarade med fel: ${err.slice(0, 200)}`);
    }

    const json = await resp.json();
    const content = json?.choices?.[0]?.message?.content;
    if (!content) throw new Error("Tomt svar fran AI");

    let payslip: ParsedPayslip;
    try {
      payslip = JSON.parse(content) as ParsedPayslip;
    } catch {
      throw new Error("Kunde inte tolka svaret fran AI");
    }

    if (!payslip.period_start || !payslip.period_end) {
      return { payslip, warning: "Lonespecen saknar tydliga perioddatum - kontrollera manuellt." };
    }

    const warning =
      payslip.confidence < 0.7
        ? "Lag sakerhet pa tolkningen - kontrollera alla falt noggrant."
        : undefined;

    return { payslip, warning };
  });
