import { describe, expect, it } from "vitest";
import { AiProviderRegistry } from "../src/providers/registry/providerRegistry.js";

describe("AiProviderRegistry", () => {
  it("lists built-in providers", () => {
    const providers = new AiProviderRegistry().list().map((provider) => provider.id);

    expect(providers).toContain("openrouter");
    expect(providers).toContain("ollama");
    expect(providers).toContain("lmstudio");
    expect(providers).toContain("llamacpp");
    expect(providers).toContain("local");
  });
});
