import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { z } from "zod";
import { getAppDataPaths } from "../../storage/paths/appDataPaths.js";

export type MarketplacePlugin = {
  name: string;
  description?: string | undefined;
  repository?: string | undefined;
  archiveUrl?: string | undefined;
  version?: string | undefined;
};

const defaultRegistryUrl =
  process.env.ORC_PLUGIN_REGISTRY_URL ??
  "https://raw.githubusercontent.com/openrouter-cli/plugins/main/registry.json";

const registrySchema = z.object({
  plugins: z.array(
    z.object({
      name: z.string(),
      description: z.string().optional(),
      repository: z.string().optional(),
      archiveUrl: z.string().optional(),
      version: z.string().optional()
    })
  )
});

export async function fetchMarketplace(url = defaultRegistryUrl): Promise<MarketplacePlugin[]> {
  const cached = await readCachedMarketplace();

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Plugin registry request failed with ${response.status}`);
    }

    const plugins = registrySchema.parse(await response.json()).plugins;
    await writeCachedMarketplace(plugins);
    return plugins;
  } catch (error) {
    if (cached) {
      return cached;
    }

    throw error;
  }
}

async function readCachedMarketplace(): Promise<MarketplacePlugin[] | undefined> {
  const paths = await getAppDataPaths();

  try {
    const raw = JSON.parse(await readFile(paths.pluginRegistryCache, "utf8")) as {
      plugins?: MarketplacePlugin[];
    };
    return Array.isArray(raw.plugins) ? raw.plugins : undefined;
  } catch {
    return undefined;
  }
}

async function writeCachedMarketplace(plugins: MarketplacePlugin[]): Promise<void> {
  const paths = await getAppDataPaths();
  await mkdir(dirname(paths.pluginRegistryCache), { recursive: true });
  await writeFile(
    paths.pluginRegistryCache,
    `${JSON.stringify({ fetchedAt: new Date().toISOString(), plugins }, null, 2)}\n`,
    "utf8"
  );
}
