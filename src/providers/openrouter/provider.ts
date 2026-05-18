import { OpenRouterClient } from "../../ai/openrouter.js";
import { readApiKey } from "../../config/loadConfig.js";
import type { AiProvider, ProviderChatOptions, ProviderModel } from "../types.js";
import { UserFacingError } from "../../utils/errors.js";

export class OpenRouterProvider implements AiProvider {
  readonly id = "openrouter";
  readonly name = "OpenRouter";
  readonly kind = "cloud";
  private readonly client = new OpenRouterClient();

  async isAvailable(): Promise<boolean> {
    await Promise.resolve();
    return Boolean(readApiKey());
  }

  async listModels(): Promise<ProviderModel[]> {
    const apiKey = this.apiKey();
    const models = await this.client.listModels(apiKey);
    return models.map((model) => ({ id: model.id, name: model.name }));
  }

  async chat(options: ProviderChatOptions): Promise<string> {
    const chatOptions = {
      apiKey: this.apiKey(),
      model: options.model,
      temperature: options.temperature,
      messages: options.messages
    };

    return this.client.chat({
      ...chatOptions,
      ...(options.signal ? { signal: options.signal } : {}),
      ...(options.onToken ? { onToken: options.onToken } : {})
    });
  }

  private apiKey(): string {
    const apiKey = readApiKey();

    if (!apiKey) {
      throw new UserFacingError("Missing OPENROUTER_API_KEY");
    }

    return apiKey;
  }
}
