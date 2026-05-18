import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { z } from "zod";
import type { ModelInfo, ModelRegistryResult } from "../core/types.js";
import { UserFacingError } from "../utils/errors.js";

export type ModelFilters = {
  search?: string;
  provider?: string;
  free?: boolean;
  minContext?: number;
  multimodal?: boolean;
  reasoning?: boolean;
};

export type ModelRecommendation = {
  label: string;
  models: ModelInfo[];
};

const modelsUrl = "https://openrouter.ai/api/v1/models";
const cachePath = ".openrouter-cli/models-cache.json";
const cacheTtlMs = 6 * 60 * 60 * 1000;

const cacheSchema = z.object({
  fetchedAt: z.string(),
  models: z.array(z.custom<ModelInfo>((value) => typeof value === "object" && value !== null))
});

export class ModelRegistry {
  async refreshModels(cwd: string, apiKey: string): Promise<ModelRegistryResult> {
    const models = await this.fetchModels(apiKey);
    await this.writeCache(cwd, models);
    return { models, source: "live" };
  }

  async getModels(cwd: string, apiKey?: string): Promise<ModelRegistryResult> {
    const cached = await this.readCache(cwd);

    if (cached && Date.now() - Date.parse(cached.fetchedAt) < cacheTtlMs) {
      return { models: cached.models, source: "cache" };
    }

    if (!apiKey) {
      if (cached) {
        return {
          models: cached.models,
          source: "stale-cache",
          warning: "OpenRouter API key missing. Showing cached models."
        };
      }

      throw new UserFacingError("Missing OPENROUTER_API_KEY and no model cache is available");
    }

    try {
      const models = await this.fetchModels(apiKey);
      await this.writeCache(cwd, models);
      return { models, source: "live" };
    } catch (error) {
      if (cached) {
        return {
          models: cached.models,
          source: "stale-cache",
          warning: `OpenRouter unavailable. Showing cached models. ${error instanceof Error ? error.message : String(error)}`
        };
      }

      throw error;
    }
  }

  filterModels(models: ModelInfo[], filters: ModelFilters): ModelInfo[] {
    return this.sortModels(models).filter((model) => {
      if (filters.search && !modelSearchText(model).includes(filters.search.toLowerCase())) {
        return false;
      }

      if (filters.provider && providerOf(model) !== filters.provider.toLowerCase()) {
        return false;
      }

      if (filters.free && !isFreeModel(model)) {
        return false;
      }

      if (filters.minContext && contextLengthOf(model) < filters.minContext) {
        return false;
      }

      if (filters.multimodal && !isMultimodalModel(model)) {
        return false;
      }

      if (filters.reasoning && !isReasoningModel(model)) {
        return false;
      }

      return true;
    });
  }

  groupByProvider(models: ModelInfo[]): Map<string, ModelInfo[]> {
    const groups = new Map<string, ModelInfo[]>();

    for (const model of models) {
      const provider = providerOf(model);
      groups.set(provider, [...(groups.get(provider) ?? []), model]);
    }

    return new Map([...groups.entries()].sort(([a], [b]) => a.localeCompare(b)));
  }

  recommendations(models: ModelInfo[]): ModelRecommendation[] {
    const sorted = this.sortModels(models);
    return [
      {
        label: "Recommended Free",
        models: sorted.filter(isFreeModel).slice(0, 5)
      },
      {
        label: "Premium Recommended",
        models: sorted.filter((model) => !isFreeModel(model)).slice(0, 5)
      },
      {
        label: "Fastest",
        models: sortedBySignal(sorted, fastestScore).slice(0, 5)
      },
      {
        label: "Best Coding",
        models: sortedBySignal(sorted, codingScore).slice(0, 5)
      },
      {
        label: "Long Context",
        models: [...sorted].sort((a, b) => contextLengthOf(b) - contextLengthOf(a)).slice(0, 5)
      }
    ].filter((group) => group.models.length > 0);
  }

  sortModels(models: ModelInfo[]): ModelInfo[] {
    return [...models].sort((a, b) => {
      const freeDelta = Number(isFreeModel(b)) - Number(isFreeModel(a));

      if (freeDelta !== 0) {
        return freeDelta;
      }

      const contextDelta = contextLengthOf(b) - contextLengthOf(a);

      if (contextDelta !== 0) {
        return contextDelta;
      }

      return a.id.localeCompare(b.id);
    });
  }

  private async fetchModels(apiKey: string): Promise<ModelInfo[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    try {
      const response = await this.requestWithRetry({
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        signal: controller.signal
      });
      const data = (await response.json()) as { data?: ModelInfo[] };
      return data.data ?? [];
    } finally {
      clearTimeout(timeout);
    }
  }

  private async requestWithRetry(init: RequestInit, retries = 2): Promise<Response> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        const response = await fetch(modelsUrl, init);

        if (response.ok) {
          return response;
        }

        lastError = new UserFacingError(`OpenRouter models request failed with ${response.status}`);
      } catch (error) {
        lastError = error;
      }

      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
      }
    }

    throw lastError;
  }

  private async readCache(
    cwd: string
  ): Promise<{ fetchedAt: string; models: ModelInfo[] } | undefined> {
    try {
      return cacheSchema.parse(JSON.parse(await readFile(join(cwd, cachePath), "utf8")));
    } catch {
      return undefined;
    }
  }

  private async writeCache(cwd: string, models: ModelInfo[]): Promise<void> {
    const path = join(cwd, cachePath);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(
      path,
      `${JSON.stringify({ fetchedAt: new Date().toISOString(), models }, null, 2)}\n`,
      "utf8"
    );
  }
}

export function isFreeModel(model: ModelInfo): boolean {
  if (model.id.endsWith(":free")) {
    return true;
  }

  const pricing = model.pricing ?? {};
  const values = Object.values(pricing).filter((value) => value !== null && value !== undefined);

  return values.length > 0 && values.every((value) => Number(value) === 0);
}

export function isMultimodalModel(model: ModelInfo): boolean {
  const modalities = [
    model.architecture?.modality,
    ...(model.architecture?.input_modalities ?? []),
    ...(model.architecture?.output_modalities ?? [])
  ]
    .join(" ")
    .toLowerCase();

  return (
    modalities.includes("image") || modalities.includes("vision") || modalities.includes("audio")
  );
}

export function isReasoningModel(model: ModelInfo): boolean {
  const parameters = model.supported_parameters ?? [];
  return parameters.some((parameter) => parameter.toLowerCase().includes("reasoning"));
}

export function contextLengthOf(model: ModelInfo): number {
  return model.context_length ?? model.top_provider?.context_length ?? 0;
}

export function providerOf(model: ModelInfo): string {
  return model.id.split("/")[0]?.toLowerCase() ?? "unknown";
}

function modelSearchText(model: ModelInfo): string {
  return [model.id, model.name, model.description, providerOf(model)]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function sortedBySignal(models: ModelInfo[], scorer: (model: ModelInfo) => number): ModelInfo[] {
  return [...models].sort((a, b) => scorer(b) - scorer(a) || a.id.localeCompare(b.id));
}

function fastestScore(model: ModelInfo): number {
  const text = modelSearchText(model);
  const tokenLimit = model.top_provider?.max_completion_tokens ?? 0;
  return (
    textScore(text, ["flash", "fast", "turbo", "mini", "lite", "small"]) +
    Math.min(tokenLimit / 10_000, 5)
  );
}

function codingScore(model: ModelInfo): number {
  const text = modelSearchText(model);
  return (
    textScore(text, ["code", "coder", "coding", "instruct", "sonnet", "gpt", "deepseek", "qwen"]) +
    Math.min(contextLengthOf(model) / 100_000, 10)
  );
}

function textScore(text: string, terms: string[]): number {
  return terms.reduce((score, term) => score + (text.includes(term) ? 10 : 0), 0);
}
