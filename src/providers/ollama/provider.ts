import { execa } from "execa";
import type { AiProvider, ProviderChatOptions, ProviderModel } from "../types.js";

const defaultUrl = "http://localhost:11434";

export class OllamaProvider implements AiProvider {
  readonly id = "ollama";
  readonly name = "Ollama";
  readonly kind = "local";

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${defaultUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<ProviderModel[]> {
    try {
      const response = await fetch(`${defaultUrl}/api/tags`);

      if (response.ok) {
        const data = (await response.json()) as { models?: Array<{ name: string }> };
        return (data.models ?? []).map((model) => ({ id: model.name, name: model.name }));
      }
    } catch {
      return this.listModelsFromCli();
    }

    return this.listModelsFromCli();
  }

  async chat(options: ProviderChatOptions): Promise<string> {
    const init: RequestInit = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: options.model,
        messages: options.messages,
        stream: true,
        options: {
          temperature: options.temperature
        }
      })
    };

    if (options.signal) {
      init.signal = options.signal;
    }

    const response = await fetch(`${defaultUrl}/api/chat`, init);

    if (!response.ok || !response.body) {
      throw new Error(`Ollama request failed with ${response.status}`);
    }

    return readOllamaStream(response, options.onToken);
  }

  private async listModelsFromCli(): Promise<ProviderModel[]> {
    const result = await execa("ollama", ["list"], { reject: false });

    if (result.exitCode !== 0) {
      return [];
    }

    return result.stdout
      .split("\n")
      .slice(1)
      .map((line) => line.trim().split(/\s+/)[0])
      .filter((name): name is string => Boolean(name))
      .map((name) => ({ id: name, name }));
  }
}

async function readOllamaStream(
  response: Response,
  onToken?: (token: string) => void
): Promise<string> {
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
      if (!line.trim()) {
        continue;
      }

      const data = JSON.parse(line) as { message?: { content?: string } };
      const token = data.message?.content ?? "";

      if (token) {
        output += token;
        onToken?.(token);
      }
    }
  }
}
