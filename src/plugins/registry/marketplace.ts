import { z } from "zod";

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
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Plugin registry request failed with ${response.status}`);
  }

  return registrySchema.parse(await response.json()).plugins;
}
