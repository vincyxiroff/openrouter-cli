import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import dotenv from "dotenv";
import { normalizeConfig } from "./migrateConfig.js";
import type { AppConfig } from "../core/types.js";
import { getProjectDataPaths } from "../storage/paths/projectDataPaths.js";

export async function loadConfig(cwd = process.cwd()): Promise<AppConfig> {
  dotenv.config({ path: resolve(cwd, ".env") });
  const paths = [getProjectDataPaths(cwd).projectConfig, join(cwd, ".openrouter-cli.json")];

  for (const path of paths) {
    try {
      const raw = await readFile(path, "utf8");
      return normalizeConfig(JSON.parse(raw) as Partial<AppConfig>);
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        continue;
      }

      throw error;
    }
  }

  return normalizeConfig({});
}

export function readApiKey(): string | undefined {
  return process.env.OPENROUTER_API_KEY;
}
