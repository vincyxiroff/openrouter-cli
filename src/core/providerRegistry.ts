export type ProviderDefinition = {
  name: string;
  description?: string;
  capabilities: string[];
};

export class ProviderRegistry {
  private readonly providers = new Map<string, ProviderDefinition>();

  register(provider: ProviderDefinition): void {
    this.providers.set(provider.name, provider);
  }

  get(name: string): ProviderDefinition | undefined {
    return this.providers.get(name);
  }

  list(): ProviderDefinition[] {
    return [...this.providers.values()].sort((a, b) => a.name.localeCompare(b.name));
  }
}
