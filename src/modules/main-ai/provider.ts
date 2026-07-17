// Provider registry — server-only.
// v0.1 supports exactly one adapter: Gemini. Activated only when
// GEMINI_API_KEY is present in the server env. No fallback and no fake replies.

import type { MainAIProvider, ProviderStatus } from "./types";
import { createGeminiProvider } from "./providers/gemini-provider";

let cached: MainAIProvider | null | undefined;

export function getActiveProvider(): MainAIProvider | null {
  if (cached !== undefined) return cached;
  const key = process.env.GEMINI_API_KEY;
  if (key && key.trim().length > 0) {
    cached = createGeminiProvider(key.trim(), process.env.GEMINI_MODEL);
  } else {
    cached = null;
  }
  return cached;
}

export function getProviderStatus(): ProviderStatus {
  const p = getActiveProvider();
  if (!p) {
    return {
      configured: false,
      reason:
        "Ingen AI-provider ansluten. Lägg till GEMINI_API_KEY i projektets secrets för att aktivera Gemini.",
    };
  }
  return { configured: true, provider: p.name, model: p.defaultModel };
}
