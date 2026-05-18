import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { defaultConfig } from "./defaults.js";
import { configSchema } from "./schema.js";
import type { AppConfig } from "../core/types.js";

export type MigrationResult = {
  config: AppConfig;
  changed: boolean;
};

export async function migrateConfig(cwd = process.cwd()): Promise<MigrationResult> {
  const path = resolve(cwd, ".openrouter-cli.json");
  const raw = await readExistingConfig(path);
  const parsed = raw ? (JSON.parse(raw) as Partial<AppConfig>) : {};
  const config = normalizeConfig(parsed);
  const normalized = `${JSON.stringify(config, null, 2)}\n`;
  const changed = raw !== normalized;

  if (changed && raw) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, normalized, "utf8");
  }

  return { config, changed };
}

export function normalizeConfig(config: Partial<AppConfig>): AppConfig {
  return configSchema.parse({
    ...defaultConfig,
    ...config,
    ignoredPaths: mergeIgnoredPaths(config.ignoredPaths)
  });
}

async function readExistingConfig(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return undefined;
    }

    throw error;
  }
}

function mergeIgnoredPaths(paths: string[] | undefined): string[] {
  return [...new Set([...(paths ?? []), ...defaultConfig.ignoredPaths])];
}
