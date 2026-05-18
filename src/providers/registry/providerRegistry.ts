import { OpenRouterProvider } from "../openrouter/provider.js";
import { OllamaProvider } from "../ollama/provider.js";
import { LmStudioProvider } from "../lmstudio/provider.js";
import { LlamaCppProvider } from "../llamacpp/provider.js";
import { LocalApiProvider } from "../local/provider.js";
import type { AiProvider } from "../types.js";
import { UserFacingError } from "../../utils/errors.js";

export class AiProviderRegistry {
  private readonly providers = new Map<string, AiProvider>();

  constructor() {
    this.register(new OpenRouterProvider());
    this.register(new OllamaProvider());
    this.register(new LmStudioProvider());
    this.register(new LlamaCppProvider());
    this.register(new LocalApiProvider());
  }

  register(provider: AiProvider): void {
    this.providers.set(provider.id, provider);
  }

  get(id: string): AiProvider {
    const provider = this.providers.get(id);

    if (!provider) {
      throw new UserFacingError(`Unknown provider: ${id}`);
    }

    return provider;
  }

  list(): AiProvider[] {
    return [...this.providers.values()].sort((a, b) => a.name.localeCompare(b.name));
  }
}

export function createAiProvider(provider: string): AiProvider {
  return new AiProviderRegistry().get(provider);
}
