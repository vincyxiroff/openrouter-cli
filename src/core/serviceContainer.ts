export class ServiceContainer {
  private readonly services = new Map<string, unknown>();

  set<TValue>(key: string, value: TValue): void {
    this.services.set(key, value);
  }

  get<TValue>(key: string): TValue {
    if (!this.services.has(key)) {
      throw new Error(`Service not registered: ${key}`);
    }

    return this.services.get(key) as TValue;
  }

  has(key: string): boolean {
    return this.services.has(key);
  }
}
