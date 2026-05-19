import { ProviderRegistry } from "../core/providerRegistry.js";
import { ServiceContainer } from "../core/serviceContainer.js";
import { ToolRegistry } from "../core/toolRegistry.js";
import { PluginLoader } from "../plugins/loader/pluginLoader.js";
import { fetchMarketplace } from "../plugins/registry/marketplace.js";
import { printInfo, printMuted } from "../terminal/render.js";
import { theme } from "../terminal/theme.js";
import { TrustGuard } from "../trust/guards/trustGuard.js";

export async function pluginsCommand(cwd = process.cwd()): Promise<void> {
  await new TrustGuard().ensureTrusted(cwd, "plugins");
  const loader = createLoader(cwd);
  const plugins = await loader.listInstalled();

  if (plugins.length === 0) {
    printMuted("No plugins installed.");
    return;
  }

  for (const plugin of plugins) {
    const status = plugin.enabled ? theme.success("enabled") : theme.muted("disabled");
    const error = plugin.error ? ` ${theme.danger(plugin.error)}` : "";
    console.log(
      `${plugin.manifest.name} ${status} ${theme.muted(plugin.manifest.version)}${error}`
    );
  }
}

export async function pluginInstallCommand(name: string, cwd = process.cwd()): Promise<void> {
  await new TrustGuard().ensureTrusted(cwd, "plugins");
  const installed = await createLoader(cwd).install(name);
  printInfo(`Installed plugin: ${installed}`);
}

export async function pluginSearchCommand(query = ""): Promise<void> {
  const plugins = await fetchMarketplace();
  const matches = plugins.filter((plugin) =>
    [plugin.name, plugin.description]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  if (matches.length === 0) {
    printMuted("No marketplace plugins found.");
    return;
  }

  for (const plugin of matches) {
    console.log(
      `${plugin.name} ${theme.muted(plugin.version ?? "")} ${theme.muted(plugin.description ?? "")}`
    );
  }
}

export async function pluginUpdateCommand(name: string): Promise<void> {
  const plugins = await fetchMarketplace();
  const plugin = plugins.find((entry) => entry.name === name);

  if (!plugin) {
    printMuted(`Plugin not found in registry: ${name}`);
    return;
  }

  printInfo(`Marketplace metadata found for ${name}`);
  printMuted(plugin.archiveUrl ?? plugin.repository ?? "No download URL published yet.");
}

export async function pluginRemoveCommand(name: string, cwd = process.cwd()): Promise<void> {
  await new TrustGuard().ensureTrusted(cwd, "plugins");
  await createLoader(cwd).remove(name);
  printInfo(`Removed plugin: ${name}`);
}

export async function pluginEnableCommand(name: string, cwd = process.cwd()): Promise<void> {
  await new TrustGuard().ensureTrusted(cwd, "plugins");
  await createLoader(cwd).enable(name);
  printInfo(`Enabled plugin: ${name}`);
}

export async function pluginDisableCommand(name: string, cwd = process.cwd()): Promise<void> {
  await new TrustGuard().ensureTrusted(cwd, "plugins");
  await createLoader(cwd).disable(name);
  printInfo(`Disabled plugin: ${name}`);
}

function createLoader(cwd: string): PluginLoader {
  return new PluginLoader({
    cwd,
    services: new ServiceContainer(),
    tools: new ToolRegistry(),
    providers: new ProviderRegistry()
  });
}
