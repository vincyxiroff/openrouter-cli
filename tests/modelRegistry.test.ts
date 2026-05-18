import { describe, expect, it } from "vitest";
import {
  contextLengthOf,
  isFreeModel,
  isMultimodalModel,
  isReasoningModel,
  ModelRegistry,
  providerOf
} from "../src/ai/modelRegistry.js";
import type { ModelInfo } from "../src/core/types.js";

describe("ModelRegistry", () => {
  const models: ModelInfo[] = [
    {
      id: "provider/fast-free:free",
      context_length: 32000,
      architecture: { input_modalities: ["text"] },
      supported_parameters: []
    },
    {
      id: "provider/vision-reasoner",
      context_length: 128000,
      architecture: { input_modalities: ["text", "image"] },
      pricing: { prompt: "0.000003", completion: "0.000015" },
      supported_parameters: ["reasoning"]
    },
    {
      id: "other/coder",
      top_provider: { context_length: 64000 },
      pricing: { prompt: "0", completion: "0" }
    }
  ];

  it("detects model metadata", () => {
    expect(isFreeModel(models[0]!)).toBe(true);
    expect(isFreeModel(models[2]!)).toBe(true);
    expect(isMultimodalModel(models[1]!)).toBe(true);
    expect(isReasoningModel(models[1]!)).toBe(true);
    expect(contextLengthOf(models[2]!)).toBe(64000);
    expect(providerOf(models[1]!)).toBe("provider");
  });

  it("filters models", () => {
    const registry = new ModelRegistry();

    expect(registry.filterModels(models, { free: true }).map((model) => model.id)).toEqual([
      "other/coder",
      "provider/fast-free:free"
    ]);
    expect(registry.filterModels(models, { provider: "provider" })).toHaveLength(2);
    expect(registry.filterModels(models, { minContext: 100000 })).toHaveLength(1);
    expect(registry.filterModels(models, { multimodal: true })).toHaveLength(1);
    expect(registry.filterModels(models, { reasoning: true })).toHaveLength(1);
  });
});
