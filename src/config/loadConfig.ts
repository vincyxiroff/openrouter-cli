import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import dotenv from "dotenv";
import { defaultConfig } from "./defaults.js";
import { configSchema } from "./schema.js";
import type { AppConfig } from "../core/types.js";

export async function loadConfig(cwd = process.cwd()): Promise<AppConfig> {
  dotenv.config({ path: resolve(cwd, ".env") });
  const path = resolve(cwd, ".openrouter-cli.json");

  try {
    const raw = await readFile(path, "utf8");
    return configSchema.parse({ ...defaultConfig, ...JSON.parse(raw) });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return defaultConfig;
    }

    throw error;
  }
}

export function readApiKey(): string | undefined {
  return process.env.OPENROUTER_API_KEY;
}
