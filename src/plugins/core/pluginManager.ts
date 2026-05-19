import type { Command } from "commander";
import { ProviderRegistry } from "../../core/providerRegistry.js";
import { ServiceContainer } from "../../core/serviceContainer.js";
import { ToolRegistry } from "../../core/toolRegistry.js";
import { PluginHookRunner } from "../hooks/pluginHooks.js";
import { PluginLoader } from "../loader/pluginLoader.js";
import type { LoadedPlugin } from "../types/plugin.js";
import { TrustGuard } from "../../trust/guards/trustGuard.js";

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
  const trust = await new TrustGuard().state(cwd);

  if (trust.level === "restricted") {
    const plugins: LoadedPlugin[] = [];
    const hooks = new PluginHookRunner(cwd, services, tools, providers, plugins);
    services.set("trustState", trust);
    return { plugins, hooks, tools, providers, services };
  }

  const loader = new PluginLoader({ cwd, services, tools, providers });
  const plugins = await loader.loadEnabled();
  const hooks = new PluginHookRunner(cwd, services, tools, providers, plugins);
  services.set("trustState", trust);
  return { plugins, hooks, tools, providers, services };
}

export async function registerPluginCommands(program: Command, cwd = process.cwd()): Promise<void> {
  const runtime = await withTimeout(createPluginRuntime(cwd), 2_500);

  if (!runtime) {
    return;
  }

  for (const plugin of runtime.plugins) {
    try {
      await withTimeout(
        plugin.module?.commands?.(program, {
          cwd,
          manifest: plugin.manifest,
          services: runtime.services,
          tools: runtime.tools,
          providers: runtime.providers
        }),
        2_500
      );
    } catch {
      continue;
    }
  }
}

async function withTimeout<TValue>(
  promise: Promise<TValue> | TValue | undefined,
  ms: number
): Promise<TValue | undefined> {
  if (!promise) {
    return undefined;
  }

  return Promise.race([
    Promise.resolve(promise),
    new Promise<undefined>((resolve) => {
      setTimeout(() => resolve(undefined), ms);
    })
  ]);
}
