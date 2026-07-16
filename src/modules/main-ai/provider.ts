// Provider registry — server-only. No AI provider is wired up in v0.1.
// This module intentionally never imports the browser Supabase client.

import type { MainAIProvider, ProviderStatus } from "./types";

// Registry of concrete providers. Empty by design in v0.1.
// Future: register OpenAI / Anthropic / Gemini adapters here based on env secrets.
const registry: Record<string, MainAIProvider> = {};

export function getActiveProvider(): MainAIProvider | null {
  const keys = Object.keys(registry);
  if (keys.length === 0) return null;
  return registry[keys[0]!]!;
}

export function getProviderStatus(): ProviderStatus {
  const p = getActiveProvider();
  if (!p) {
    return {
      configured: false,
      reason:
        "MainAI-grunden är installerad. Ingen AI-provider är ansluten ännu.",
    };
  }
  return { configured: true, provider: p.name, model: p.defaultModel };
}
