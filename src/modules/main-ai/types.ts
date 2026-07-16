// MainAI shared types

export type MessageRole = "user" | "assistant" | "system" | "tool";

export type Conversation = {
  id: string;
  user_id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  user_id: string;
  role: MessageRole;
  content: string;
  provider: string | null;
  model: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
};

export type Task = {
  id: string;
  user_id: string;
  conversation_id: string | null;
  title: string;
  description: string | null;
  status: string;
  risk_level: "low" | "medium" | "high";
  requires_approval: boolean;
  created_at: string;
  updated_at: string;
};

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [k: string]: JsonValue };

export type AuditEvent = {
  id: string;
  user_id: string;
  conversation_id: string | null;
  task_id: string | null;
  event_type: string;
  event_data: JsonValue;
  created_at: string;
};

// Provider contract — future adapters implement this.
export type ProviderUsage = { promptTokens?: number; completionTokens?: number; costUsd?: number };

export type ProviderGenerateInput = {
  messages: Array<{ role: MessageRole; content: string }>;
  model?: string;
};

export type ProviderGenerateResult = {
  content: string;
  provider: string;
  model: string;
  usage?: ProviderUsage;
};

export interface MainAIProvider {
  readonly name: string;
  readonly defaultModel: string;
  generate(input: ProviderGenerateInput): Promise<ProviderGenerateResult>;
  healthCheck(): Promise<{ ok: boolean; message?: string }>;
  estimateUsage(input: ProviderGenerateInput): Promise<ProviderUsage>;
}

export type ProviderStatus =
  | { configured: false; reason: string }
  | { configured: true; provider: string; model: string };
