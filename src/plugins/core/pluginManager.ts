import type { Command } from "commander";
import { ProviderRegistry } from "../../core/providerRegistry.js";
import { ServiceContainer } from "../../core/serviceContainer.js";
import { ToolRegistry } from "../../core/toolRegistry.js";
import { PluginHookRunner } from "../hooks/pluginHooks.js";
import { PluginLoader } from "../loader/pluginLoader.js";
import type { LoadedPlugin } from "../types/plugin.js";

export type PluginRuntime = {
  plugins: LoadedPlugin[];
  hooks: PluginHookRunner;
  tools: ToolRegistry;
  providers: ProviderRegistry;
  services: ServiceContainer;
};

export async function createPluginRuntime(cwd = process.cwd()): Promise<PluginRuntime> {
  const services = new ServiceContainer();
  const tools = new ToolRegistry();
  const providers = new ProviderRegistry();
  const loader = new PluginLoader({ cwd, services, tools, providers });
  const plugins = await loader.loadEnabled();
  const hooks = new PluginHookRunner(cwd, services, tools, providers, plugins);
  return { plugins, hooks, tools, providers, services };
}

export async function registerPluginCommands(program: Command, cwd = process.cwd()): Promise<void> {
  const runtime = await createPluginRuntime(cwd);

  for (const plugin of runtime.plugins) {
    try {
      await plugin.module?.commands?.(program, {
        cwd,
        manifest: plugin.manifest,
        services: runtime.services,
        tools: runtime.tools,
        providers: runtime.providers
      });
    } catch {
      continue;
    }
  }
}
