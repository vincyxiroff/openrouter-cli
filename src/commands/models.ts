import ora from "ora";
import {
  contextLengthOf,
  isFreeModel,
  isMultimodalModel,
  isReasoningModel,
  type ModelFilters,
  ModelRegistry,
  providerOf
} from "../ai/modelRegistry.js";
import { readApiKey } from "../config/loadConfig.js";
import type { ModelInfo } from "../core/types.js";
import { printMuted } from "../terminal/render.js";
import { theme } from "../terminal/theme.js";

export type ModelsCommandOptions = {
  free?: boolean;
  search?: string;
  provider?: string;
  context?: string;
  json?: boolean;
  multimodal?: boolean;
  reasoning?: boolean;
  page?: string;
  limit?: string;
};

export async function modelsCommand(
  options: ModelsCommandOptions = {},
  cwd = process.cwd()
): Promise<void> {
  const minContext = parseNumberOption(options.context);
  const page = parseNumberOption(options.page) ?? 1;
  const limit = parseNumberOption(options.limit) ?? 30;
  const spinner = ora("Discovering OpenRouter models").start();
  const registry = new ModelRegistry();
  const result = await registry.getModels(cwd, readApiKey());
  const models = registry.filterModels(result.models, buildFilters(options, minContext));
  spinner.stop();

  if (options.json) {
    console.log(
      JSON.stringify({ source: result.source, warning: result.warning, models }, null, 2)
    );
    return;
  }

  if (result.warning) {
    console.log(theme.warning(result.warning));
  }

  renderModels(models, { page, limit, grouped: Boolean(options.provider || options.search) });
}

function renderModels(
  models: ModelInfo[],
  options: { page: number; limit: number; grouped: boolean }
): void {
  console.log(theme.title("Available Models"));
  printMuted(`${models.length.toLocaleString()} models matched`);
  console.log("");

  const start = Math.max(0, (options.page - 1) * options.limit);
  const pageModels = models.slice(start, start + options.limit);

  if (pageModels.length === 0) {
    printMuted("No models found.");
    return;
  }

  if (options.grouped) {
    renderProviderGroups(pageModels);
  } else {
    renderSection("Free Models", pageModels.filter(isFreeModel), "✓");
    renderSection(
      "Premium Models",
      pageModels.filter((model) => !isFreeModel(model)),
      "★"
    );
  }

  const totalPages = Math.max(1, Math.ceil(models.length / options.limit));
  console.log("");
  printMuted(`Page ${options.page.toLocaleString()} of ${totalPages.toLocaleString()}`);
}

function renderProviderGroups(models: ModelInfo[]): void {
  const providers = new Map<string, ModelInfo[]>();

  for (const model of models) {
    const provider = providerOf(model);
    providers.set(provider, [...(providers.get(provider) ?? []), model]);
  }

  for (const [provider, providerModels] of [...providers.entries()].sort(([a], [b]) =>
    a.localeCompare(b)
  )) {
    renderSection(provider, providerModels, "•");
  }
}

function renderSection(title: string, models: ModelInfo[], icon: string): void {
  if (models.length === 0) {
    return;
  }

  console.log(theme.accent(title));
  console.log(theme.muted("─".repeat(Math.max(20, title.length))));

  for (const model of models) {
    console.log(`${icon} ${formatModel(model)}`);
  }

  console.log("");
}

function formatModel(model: ModelInfo): string {
  const badges = [
    isFreeModel(model) ? "free" : undefined,
    contextLengthOf(model) ? `${contextLengthOf(model).toLocaleString()} ctx` : undefined,
    isMultimodalModel(model) ? "multimodal" : undefined,
    isReasoningModel(model) ? "reasoning" : undefined
  ].filter(Boolean);

  return `${theme.title(model.id)} ${theme.muted(badges.join(" · "))}`;
}

function parseNumberOption(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function buildFilters(options: ModelsCommandOptions, minContext: number | undefined): ModelFilters {
  const filters: ModelFilters = {};

  if (options.free !== undefined) {
    filters.free = options.free;
  }

  if (options.search) {
    filters.search = options.search;
  }

  if (options.provider) {
    filters.provider = options.provider;
  }

  if (minContext !== undefined) {
    filters.minContext = minContext;
  }

  if (options.multimodal !== undefined) {
    filters.multimodal = options.multimodal;
  }

  if (options.reasoning !== undefined) {
    filters.reasoning = options.reasoning;
  }

  return filters;
}
