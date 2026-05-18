import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import type { PluginManifest } from "../types/plugin.js";

const manifestSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  description: z.string().optional(),
  author: z.string().optional(),
  entry: z.string().min(1)
});

export async function readPluginManifest(pluginPath: string): Promise<PluginManifest> {
  const raw = await readFile(join(pluginPath, "plugin.json"), "utf8");
  return manifestSchema.parse(JSON.parse(raw));
}
