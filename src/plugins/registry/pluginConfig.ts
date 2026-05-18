import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { z } from "zod";

export type PluginConfig = {
  enabled: string[];
};

const pluginConfigPath = ".openrouter-cli/plugins.json";
const pluginConfigSchema = z.object({
  enabled: z.array(z.string()).default([])
});

export async function readPluginConfig(cwd: string): Promise<PluginConfig> {
  try {
    const raw = await readFile(join(cwd, pluginConfigPath), "utf8");
    return pluginConfigSchema.parse(JSON.parse(raw));
  } catch {
    return { enabled: [] };
  }
}

export async function writePluginConfig(cwd: string, config: PluginConfig): Promise<void> {
  const path = join(cwd, pluginConfigPath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(
    path,
    `${JSON.stringify({ enabled: unique(config.enabled) }, null, 2)}\n`,
    "utf8"
  );
}

export function pluginsDir(cwd: string): string {
  return join(cwd, ".openrouter-cli/plugins");
}

function unique(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}
