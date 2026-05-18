import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import dotenv from "dotenv";
import { normalizeConfig } from "./migrateConfig.js";
import type { AppConfig } from "../core/types.js";

export async function loadConfig(cwd = process.cwd()): Promise<AppConfig> {
  dotenv.config({ path: resolve(cwd, ".env") });
  const path = resolve(cwd, ".openrouter-cli.json");

  try {
    const raw = await readFile(path, "utf8");
    return normalizeConfig(JSON.parse(raw) as Partial<AppConfig>);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return normalizeConfig({});
    }

    throw error;
  }
}

export function readApiKey(): string | undefined {
  return process.env.OPENROUTER_API_KEY;
}
