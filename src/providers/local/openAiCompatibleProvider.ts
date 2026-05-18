import type { AiProvider, ProviderChatOptions, ProviderModel } from "../types.js";

export type OpenAiCompatibleProviderOptions = {
  id: string;
  name: string;
  baseUrl: string;
};

export class OpenAiCompatibleProvider implements AiProvider {
  readonly id: string;
  readonly name: string;
  readonly kind = "local";

  constructor(private readonly options: OpenAiCompatibleProviderOptions) {
    this.id = options.id;
    this.name = options.name;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.options.baseUrl}/models`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<ProviderModel[]> {
    try {
      const response = await fetch(`${this.options.baseUrl}/models`);

      if (!response.ok) {
        return [];
      }

      const data = (await response.json()) as { data?: Array<{ id: string }> };
      return (data.data ?? []).map((model) => ({ id: model.id, name: model.id }));
    } catch {
      return [];
    }
  }

  async chat(options: ProviderChatOptions): Promise<string> {
    const init: RequestInit = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: options.model,
        messages: options.messages,
        temperature: options.temperature,
        stream: true
      })
    };

    if (options.signal) {
      init.signal = options.signal;
    }

    const response = await fetch(`${this.options.baseUrl}/chat/completions`, init);

    if (!response.ok || !response.body) {
      throw new Error(`${this.name} request failed with ${response.status}`);
    }

    return readSse(response, options.onToken);
  }
}

async function readSse(response: Response, onToken?: (token: string) => void): Promise<string> {
  const reader = response.body?.getReader();

  if (!reader) {
    return "";
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let output = "";

  for (;;) {
    const { done, value } = await reader.read();

    if (done) {
      return output;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const event = line.trim();

      if (!event.startsWith("data:")) {
        continue;
      }

      const payload = event.slice(5).trim();

      if (payload === "[DONE]") {
        return output;
      }

      const data = JSON.parse(payload) as { choices?: Array<{ delta?: { content?: string } }> };
      const token = data.choices?.[0]?.delta?.content ?? "";

      if (token) {
        output += token;
        onToken?.(token);
      }
    }
  }
}
