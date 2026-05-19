import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { z } from "zod";
import { getProjectDataPaths } from "../../storage/paths/projectDataPaths.js";

export type PluginConfig = {
  enabled: string[];
};

const pluginConfigSchema = z.object({
  enabled: z.array(z.string()).default([])
});

export async function readPluginConfig(cwd: string): Promise<PluginConfig> {
  try {
    const raw = await readFile(getProjectDataPaths(cwd).plugins, "utf8");
    return pluginConfigSchema.parse(JSON.parse(raw));
  } catch {
    return { enabled: [] };
  }
}

export async function writePluginConfig(cwd: string, config: PluginConfig): Promise<void> {
  const path = getProjectDataPaths(cwd).plugins;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(
    path,
    `${JSON.stringify({ enabled: unique(config.enabled) }, null, 2)}\n`,
    "utf8"
  );
}

export function pluginsDir(cwd: string): string {
  return getProjectDataPaths(cwd).pluginsDir;
}

function unique(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}
