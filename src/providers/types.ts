import type { ChatMessage } from "../core/types.js";

export type ProviderChatOptions = {
  model: string;
  temperature: number;
  messages: ChatMessage[];
  signal?: AbortSignal;
  onToken?: (token: string) => void;
};

export type ProviderModel = {
  id: string;
  name?: string | undefined;
};

export type AiProvider = {
  id: string;
  name: string;
  kind: "cloud" | "local";
  isAvailable(): Promise<boolean>;
  listModels(): Promise<ProviderModel[]>;
  chat(options: ProviderChatOptions): Promise<string>;
};
