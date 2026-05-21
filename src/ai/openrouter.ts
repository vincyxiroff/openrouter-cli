import type { ChatMessage, ModelInfo } from "../core/types.js";
import { UserFacingError } from "../utils/errors.js";

export type ChatOptions = {
  apiKey: string;
  model: string;
  temperature: number;
  messages: ChatMessage[];
  signal?: AbortSignal;
  onToken?: (token: string) => void;
};

const chatUrl = "https://openrouter.ai/api/v1/chat/completions";
const modelsUrl = "https://openrouter.ai/api/v1/models";

export class OpenRouterClient {
  async chat(options: ChatOptions): Promise<string> {
    const init: RequestInit = {
      method: "POST",
      headers: this.headers(options.apiKey),
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

    const response = await this.requestWithRetry(chatUrl, init);

    return this.readStream(response, options.onToken);
  }

  async listModels(apiKey?: string): Promise<ModelInfo[]> {
    const init: RequestInit = {};

    if (apiKey) {
      init.headers = this.headers(apiKey);
    }

    const response = await this.requestWithRetry(modelsUrl, init);
    const data = (await response.json()) as { data?: ModelInfo[] };
    return data.data ?? [];
  }

  private headers(apiKey: string): HeadersInit {
    return {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://github.com/openrouter-cli/openrouter-cli",
      "X-Title": "openrouter-cli"
    };
  }

  private async requestWithRetry(url: string, init: RequestInit, retries = 2): Promise<Response> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        const response = await fetch(url, init);

        if (response.ok) {
          return response;
        }

        if (response.status !== 429 && response.status < 500) {
          throw new UserFacingError(await this.formatError(response));
        }

        lastError = new UserFacingError(await this.formatError(response));
      } catch (error) {
        lastError = error;
      }

      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
      }
    }

    throw lastError;
  }

  private async formatError(response: Response): Promise<string> {
    const body = await response.text();
    const detail = body.trim().slice(0, 500);
    return detail ? `OpenRouter ${response.status}: ${detail}` : `OpenRouter ${response.status}`;
  }

  private async readStream(response: Response, onToken?: (token: string) => void): Promise<string> {
    if (!response.body) {
      throw new UserFacingError("OpenRouter returned an empty response body");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let output = "";

    for (;;) {
      const { done, value } = await reader.read();

      if (done) {
        break;
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

        const token = this.parseToken(payload);

        if (token) {
          output += token;
          onToken?.(token);
        }
      }
    }

    return output;
  }

  private parseToken(payload: string): string {
    try {
      const data = JSON.parse(payload) as {
        error?: { message?: string; code?: string | number };
        choices?: Array<{ delta?: { content?: string }; message?: { content?: string } }>;
      };

      if (data.error) {
        throw new UserFacingError(
          data.error.message ?? `OpenRouter stream error${data.error.code ? `: ${data.error.code}` : ""}`
        );
      }

      return data.choices?.[0]?.delta?.content ?? data.choices?.[0]?.message?.content ?? "";
    } catch (error) {
      if (error instanceof UserFacingError) {
        throw error;
      }

      return "";
    }
  }
}
