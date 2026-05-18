import { select } from "@inquirer/prompts";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import ora from "ora";
import { defaultConfig } from "../config/defaults.js";
import { loadConfig } from "../config/loadConfig.js";
import { AiProviderRegistry } from "../providers/registry/providerRegistry.js";
import { printInfo, printMuted } from "../terminal/render.js";
import { theme } from "../terminal/theme.js";

export async function providersCommand(): Promise<void> {
  const registry = new AiProviderRegistry();

  for (const provider of registry.list()) {
    const available = await provider.isAvailable();
    const status = available ? theme.success("available") : theme.muted("not detected");
    console.log(`${provider.name} ${status} ${theme.muted(provider.id)}`);
  }
}

export async function providerSetupCommand(cwd = process.cwd()): Promise<void> {
  const registry = new AiProviderRegistry();
  const providerId = await select({
    message: "Choose provider",
    choices: registry.list().map((provider) => ({
      name: provider.name,
      value: provider.id
    }))
  });
  const provider = registry.get(providerId);
  const spinner = ora(`Detecting ${provider.name}`).start();
  const models = await provider.listModels();
  spinner.stop();

  if (models.length === 0) {
    printMuted(`No models detected for ${provider.name}.`);
  }

  const model = models.length
    ? await select({
        message: "Choose model",
        choices: models.map((entry) => ({ name: entry.name ?? entry.id, value: entry.id }))
      })
    : defaultConfig.model;
  const current = await loadConfig(cwd);
  const next = { ...current, provider: provider.id, model };
  await writeFile(join(cwd, ".openrouter-cli.json"), `${JSON.stringify(next, null, 2)}\n`, "utf8");
  printInfo(`Provider configured: ${provider.name}`);
}
