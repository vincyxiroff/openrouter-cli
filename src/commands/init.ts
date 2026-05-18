import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { confirm, select, Separator } from "@inquirer/prompts";
import { ModelRegistry, contextLengthOf, isFreeModel } from "../ai/modelRegistry.js";
import { defaultConfig } from "../config/defaults.js";
import { readApiKey } from "../config/loadConfig.js";
import type { AppConfig, ModelInfo } from "../core/types.js";
import { printInfo, printMuted } from "../terminal/render.js";
import { theme } from "../terminal/theme.js";

export async function initCommand(cwd = process.cwd()): Promise<void> {
  const configPath = join(cwd, ".openrouter-cli.json");
  const exists = await pathExists(configPath);

  if (exists) {
    const overwrite = await confirm({
      message: ".openrouter-cli.json exists. Overwrite?",
      default: false
    });

    if (!overwrite) {
      printMuted("Configuration unchanged.");
      return;
    }
  }

  const config = await buildInitialConfig(cwd);
  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  printInfo("Created .openrouter-cli.json");
}

async function buildInitialConfig(cwd: string): Promise<AppConfig> {
  try {
    const registry = new ModelRegistry();
    const result = await registry.getModels(cwd, readApiKey());

    if (result.warning) {
      console.log(theme.warning(result.warning));
    }

    const model = await chooseModel(registry.recommendations(result.models));
    return { ...defaultConfig, model };
  } catch (error) {
    printMuted(error instanceof Error ? error.message : String(error));
    printMuted(`Using default model: ${defaultConfig.model}`);
    return defaultConfig;
  }
}

async function chooseModel(
  recommendations: ReturnType<ModelRegistry["recommendations"]>
): Promise<string> {
  const choices = recommendations.flatMap((recommendation) => [
    new Separator(` ${recommendation.label} `),
    ...recommendation.models.map((model) => ({
      name: formatChoice(model),
      value: model.id
    }))
  ]);

  if (choices.length === 0) {
    return defaultConfig.model;
  }

  return select({
    message: "Choose default model",
    pageSize: 20,
    choices
  });
}

function formatChoice(model: ModelInfo): string {
  const badges = [
    isFreeModel(model) ? "free" : "premium",
    contextLengthOf(model) ? `${contextLengthOf(model).toLocaleString()} ctx` : undefined
  ].filter(Boolean);

  return `${model.id} ${badges.join(" · ")}`;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
