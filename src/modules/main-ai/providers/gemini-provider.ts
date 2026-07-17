// Gemini provider adapter — server-only. Reads GEMINI_API_KEY from env.
// Never logs, returns or persists the key. Uses the Google Generative
// Language REST API directly (no SDK) to keep the adapter dependency-free.
//
// History policy: the caller is responsible for trimming; we accept the
// provided array as-is. See main-ai-service.functions.ts for the limits.

import type {
  MainAIProvider,
  ProviderGenerateInput,
  ProviderGenerateResult,
  ProviderUsage,
} from "../types";

const DEFAULT_MODEL = "gemini-2.5-flash";
const REQUEST_TIMEOUT_MS = 30_000;

type GeminiPart = { text: string };
type GeminiContent = { role: "user" | "model"; parts: GeminiPart[] };

function toGeminiContents(
  messages: ProviderGenerateInput["messages"],
): { system?: string; contents: GeminiContent[] } {
  let system: string | undefined;
  const contents: GeminiContent[] = [];
  for (const m of messages) {
    if (m.role === "system") {
      system = system ? `${system}\n\n${m.content}` : m.content;
      continue;
    }
    if (m.role === "tool") continue; // not supported in v0.1
    contents.push({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    });
  }
  return { system, contents };
}

export function createGeminiProvider(apiKey: string, model?: string): MainAIProvider {
  const usedModel = model ?? DEFAULT_MODEL;

  async function call(
    input: ProviderGenerateInput,
    signal: AbortSignal,
  ): Promise<{ text: string; usage?: ProviderUsage }> {
    const { system, contents } = toGeminiContents(input.messages);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      input.model ?? usedModel,
    )}:generateContent`;

    const body: Record<string, unknown> = { contents };
    if (system) body.systemInstruction = { parts: [{ text: system }] };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!res.ok) {
      // Never surface the raw provider body (may include prompt echoes). Map status.
      const status = res.status;
      const kind =
        status === 401 || status === 403
          ? "provider_auth_failed"
          : status === 429
            ? "provider_rate_limited"
            : status >= 500
              ? "provider_unavailable"
              : "provider_bad_request";
      throw new Error(kind);
    }

    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    };
    const text =
      json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    if (!text.trim()) throw new Error("provider_empty_response");
    const usage: ProviderUsage = {
      promptTokens: json.usageMetadata?.promptTokenCount,
      completionTokens: json.usageMetadata?.candidatesTokenCount,
    };
    return { text, usage };
  }

  return {
    name: "gemini",
    defaultModel: usedModel,

    async generate(input): Promise<ProviderGenerateResult> {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const { text, usage } = await call(input, controller.signal);
        return { content: text, provider: "gemini", model: input.model ?? usedModel, usage };
      } catch (e: any) {
        if (e?.name === "AbortError") throw new Error("provider_timeout");
        throw e;
      } finally {
        clearTimeout(t);
      }
    },

    async healthCheck() {
      return { ok: true };
    },

    async estimateUsage() {
      return {};
    },
  };
}
