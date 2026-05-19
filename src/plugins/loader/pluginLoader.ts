import { cp, mkdir, readdir, rm, stat } from "node:fs/promises";
import { basename, isAbsolute, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { ProviderRegistry } from "../../core/providerRegistry.js";
import type { ServiceContainer } from "../../core/serviceContainer.js";
import type { ToolRegistry } from "../../core/toolRegistry.js";
import { UserFacingError } from "../../utils/errors.js";
import { readPluginManifest } from "./pluginManifest.js";
import { pluginsDir, readPluginConfig, writePluginConfig } from "../registry/pluginConfig.js";
import type { LoadedPlugin, PluginContext, PluginModule } from "../types/plugin.js";

export type PluginLoaderOptions = {
  cwd: string;
  services: ServiceContainer;
  tools: ToolRegistry;
  providers: ProviderRegistry;
};

export class PluginLoader {
  constructor(private readonly options: PluginLoaderOptions) {}

  async listInstalled(): Promise<LoadedPlugin[]> {
    const config = await readPluginConfig(this.options.cwd);
    const root = pluginsDir(this.options.cwd);
    const entries = await readDirectories(root);

    return Promise.all(
      entries.map(async (name) => {
        const path = join(root, name);

        try {
          const manifest = await readPluginManifest(path);
          return {
            manifest,
            enabled: config.enabled.includes(manifest.name),
            path
          };
        } catch (error) {
          return {
            manifest: { name, version: "unknown", entry: "" },
            enabled: false,
            path,
            error: error instanceof Error ? error.message : String(error)
          };
        }
      })
    );
  }

  async loadEnabled(): Promise<LoadedPlugin[]> {
    const installed = await this.listInstalled();
    const loaded: LoadedPlugin[] = [];

    for (const plugin of installed.filter((entry) => entry.enabled)) {
      loaded.push(await this.load(plugin));
    }

    return loaded;
  }

  async install(source: string): Promise<string> {
    const root = pluginsDir(this.options.cwd);
    await mkdir(root, { recursive: true });
    const sourcePath = isAbsolute(source) ? source : resolve(this.options.cwd, source);

    try {
      const sourceStat = await stat(sourcePath);

      if (!sourceStat.isDirectory()) {
        throw new UserFacingError("Plugin source must be a directory");
      }
    } catch {
      const existing = join(root, source);
      await readPluginManifest(existing);
      await this.enable(source);
      return source;
    }

    const manifest = await readPluginManifest(sourcePath);
    const target = join(root, manifest.name || basename(sourcePath));
    await cp(sourcePath, target, { recursive: true, force: true });
    await this.enable(manifest.name);
    return manifest.name;
  }

  async remove(name: string): Promise<void> {
    const config = await readPluginConfig(this.options.cwd);
    await writePluginConfig(this.options.cwd, {
      enabled: config.enabled.filter((pluginName) => pluginName !== name)
    });
    await rm(join(pluginsDir(this.options.cwd), name), { recursive: true, force: true });
  }

  async enable(name: string): Promise<void> {
    const installed = await this.listInstalled();

    if (!installed.some((plugin) => plugin.manifest.name === name)) {
      throw new UserFacingError(`Plugin is not installed: ${name}`);
    }

    const config = await readPluginConfig(this.options.cwd);
    await writePluginConfig(this.options.cwd, { enabled: [...config.enabled, name] });
  }

  async disable(name: string): Promise<void> {
    const config = await readPluginConfig(this.options.cwd);
    await writePluginConfig(this.options.cwd, {
      enabled: config.enabled.filter((pluginName) => pluginName !== name)
    });
  }

  private async load(plugin: LoadedPlugin): Promise<LoadedPlugin> {
    try {
      const entry = join(plugin.path, plugin.manifest.entry);
      const module = (await withTimeout(import(pathToFileURL(entry).href), 5_000)) as
        | PluginModule
        | { default?: PluginModule }
        | undefined;

      if (!module) {
        throw new Error("Plugin import timed out");
      }

      const pluginModule =
        "default" in module && module.default ? module.default : (module as PluginModule);
      const context = this.context(plugin);
      await withTimeout(pluginModule.tools?.(this.options.tools, context), 5_000);
      await withTimeout(pluginModule.providers?.(this.options.providers, context), 5_000);
      await withTimeout(pluginModule.hooks?.onInit?.(context), 5_000);
      return { ...plugin, module: pluginModule };
    } catch (error) {
      return { ...plugin, error: error instanceof Error ? error.message : String(error) };
    }
  }

  private context(plugin: LoadedPlugin): PluginContext {
    return {
      cwd: this.options.cwd,
      manifest: plugin.manifest,
      services: this.options.services,
      tools: this.options.tools,
      providers: this.options.providers
    };
  }
}

async function readDirectories(path: string): Promise<string[]> {
  try {
    const entries = await readdir(path, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch {
    return [];
  }
}

async function withTimeout<TValue>(
  promise: Promise<TValue> | void | undefined,
  ms: number
): Promise<TValue | void> {
  if (!promise) {
    return undefined;
  }

  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Plugin timed out after ${ms}ms`)), ms);
    })
  ]);
}
