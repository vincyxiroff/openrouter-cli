import { rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { confirm, number, password, select, Separator } from "@inquirer/prompts";
import dotenv from "dotenv";
import ora from "ora";
import { contextLengthOf, isFreeModel, ModelRegistry } from "../ai/modelRegistry.js";
import { defaultConfig } from "../config/defaults.js";
import { ensureGitignoreEntry, fileExists, upsertEnvValue } from "../config/envFile.js";
import { loadConfig, readApiKey } from "../config/loadConfig.js";
import type { AppConfig, ModelInfo } from "../core/types.js";
import { writeGlobalApiKey } from "../storage/app-data/apiKeyStore.js";
import { writeAuthMetadata } from "../storage/app-data/authMetadata.js";
import { ensureProjectData } from "../storage/project-data/projectData.js";
import { getProjectDataPaths } from "../storage/paths/projectDataPaths.js";
import { header, printInfo, printMuted } from "../terminal/render.js";
import { theme } from "../terminal/theme.js";
import { getVersionStatus } from "../update/autoUpdate.js";

export type SetupOptions = {
  reset?: boolean;
  model?: boolean;
  key?: boolean;
};

export async function setupCommand(options: SetupOptions = {}, cwd = process.cwd()): Promise<void> {
  dotenv.config({ path: join(cwd, ".env") });
  console.log(header(await getVersionStatus(cwd)));

  if (options.reset) {
    await resetSetup(cwd);
  }

  await ensureProjectData(cwd);
  await ensureGitignoreEntry(cwd, ".env");

  const key = options.model ? readApiKey() : await setupApiKey(cwd);

  if (options.key && !options.model) {
    await ensureHistory(cwd);
    printInfo("Setup completed successfully");
    return;
  }

  const registry = new ModelRegistry();
  const models = await loadModels(registry, cwd, key);
  const currentConfig = (await maybeLoadConfig(cwd)) ?? defaultConfig;
  const model = await chooseModel(registry.recommendations(models), currentConfig.model);

  if (options.model) {
    await writeConfig(cwd, { ...currentConfig, model });
    printInfo("Setup completed successfully");
    return;
  }

  const config = await askConfig(cwd, { ...currentConfig, model });
  await writeConfig(cwd, config);
  await ensureHistory(cwd);
  printInfo("Setup completed successfully");
  console.log("");
  printMuted('orc ask "explain this project"');
  printMuted('orc edit "fix TypeScript errors"');
  printMuted("orc models --free");
}

export async function shouldRunFirstSetup(cwd = process.cwd()): Promise<boolean> {
  return (
    !(await fileExists(getProjectDataPaths(cwd).projectConfig)) &&
    !(await fileExists(join(cwd, ".openrouter-cli.json")))
  );
}

async function resetSetup(cwd: string): Promise<void> {
  await rm(join(cwd, ".openrouter-cli.json"), { force: true });
  await rm(join(cwd, ".openrouter-cli"), { recursive: true, force: true });
}

async function setupApiKey(cwd: string): Promise<string> {
  const existing = readApiKey();

  if (existing) {
    try {
      await verifyApiKey(cwd, existing);
      await writeGlobalApiKey(existing);
      await writeAuthMetadata({
        apiKeyStorage: "global-app-data",
        updatedAt: new Date().toISOString()
      });
      printInfo("Using saved OpenRouter API key");
      return existing;
    } catch {
      printMuted("Saved OpenRouter API key could not be verified.");
    }
  }

  for (;;) {
    const apiKey = await password({
      message: "Enter your OpenRouter API key",
      mask: "*",
      validate: (value) => (value.trim().length > 0 ? true : "API key is required")
    });
    const trimmed = apiKey.trim();

    try {
      await verifyApiKey(cwd, trimmed);
      await upsertEnvValue(cwd, "OPENROUTER_API_KEY", trimmed);
      await writeGlobalApiKey(trimmed);
      await writeAuthMetadata({
        apiKeyStorage: "global-app-data",
        updatedAt: new Date().toISOString()
      });
      printInfo("API key verified");
      return trimmed;
    } catch (error) {
      console.log(theme.danger(error instanceof Error ? error.message : String(error)));
      const retry = await confirm({ message: "Try another API key?", default: true });

      if (!retry) {
        throw error;
      }
    }
  }
}

async function verifyApiKey(cwd: string, apiKey: string): Promise<void> {
  const spinner = ora("Verifying API key").start();

  try {
    await new ModelRegistry().refreshModels(cwd, apiKey);
    spinner.stop();
  } catch (error) {
    spinner.stop();
    throw error;
  }
}

async function loadModels(
  registry: ModelRegistry,
  cwd: string,
  apiKey: string | undefined
): Promise<ModelInfo[]> {
  const spinner = ora("Downloading live OpenRouter models").start();

  try {
    const result = apiKey
      ? await registry.refreshModels(cwd, apiKey)
      : await registry.getModels(cwd, apiKey);
    spinner.stop();

    if (result.warning) {
      console.log(theme.warning(result.warning));
    }

    return result.models;
  } catch (error) {
    spinner.stop();
    throw error;
  }
}

async function chooseModel(
  recommendations: ReturnType<ModelRegistry["recommendations"]>,
  fallback: string
): Promise<string> {
  const choices = recommendations.flatMap((recommendation) => [
    new Separator(` ${recommendation.label} `),
    ...recommendation.models.map((model) => ({
      name: formatModelChoice(model),
      value: model.id
    }))
  ]);

  if (choices.length === 0) {
    return fallback;
  }

  return select({
    message: "Choose default model",
    pageSize: 20,
    choices,
    default: fallback
  });
}

async function askConfig(cwd: string, config: AppConfig): Promise<AppConfig> {
  const temperature = await number({
    message: "Temperature",
    default: config.temperature,
    min: 0,
    max: 2,
    required: true
  });
  const maxContextFiles = await number({
    message: "Max context files",
    default: config.maxContextFiles,
    min: 1,
    required: true
  });
  const maxFileSizeKB = await number({
    message: "Max file size KB",
    default: config.maxFileSizeKB,
    min: 1,
    required: true
  });
  const allowCommandExecution = await confirm({
    message: "Allow command execution after confirmation?",
    default: config.allowCommandExecution
  });

  await ensureGitignoreEntry(cwd, ".env");

  return {
    ...config,
    temperature: temperature ?? defaultConfig.temperature,
    maxContextFiles: Math.trunc(maxContextFiles ?? defaultConfig.maxContextFiles),
    maxFileSizeKB: Math.trunc(maxFileSizeKB ?? defaultConfig.maxFileSizeKB),
    allowCommandExecution
  };
}

async function maybeLoadConfig(cwd: string): Promise<AppConfig | undefined> {
  if (
    !(await fileExists(getProjectDataPaths(cwd).projectConfig)) &&
    !(await fileExists(join(cwd, ".openrouter-cli.json")))
  ) {
    return undefined;
  }

  return loadConfig(cwd);
}

async function writeConfig(cwd: string, config: AppConfig): Promise<void> {
  await ensureProjectData(cwd);
  await writeFile(
    getProjectDataPaths(cwd).projectConfig,
    `${JSON.stringify(config, null, 2)}\n`,
    "utf8"
  );
}

async function ensureHistory(cwd: string): Promise<void> {
  await ensureProjectData(cwd);
  const path = getProjectDataPaths(cwd).history;

  if (!(await fileExists(path))) {
    await writeFile(path, "[]\n", "utf8");
  }
}

function formatModelChoice(model: ModelInfo): string {
  const badges = [
    isFreeModel(model) && !model.id.endsWith(":free") ? "free" : undefined,
    !isFreeModel(model) ? "premium" : undefined,
    contextLengthOf(model) ? `${contextLengthOf(model).toLocaleString()} ctx` : undefined
  ].filter(Boolean);

  return `${model.id} ${badges.join(" | ")}`;
}
