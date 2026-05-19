import type { PluginRuntime } from "../../../plugins/core/pluginManager.js";
import { builtinSlashCommands } from "../commands/builtin.js";
import { SlashCommandRegistry } from "./slashCommandRegistry.js";
import type { SlashCommand } from "./types.js";

export async function createSlashRegistry(
  cwd: string,
  runtime: PluginRuntime
): Promise<SlashCommandRegistry> {
  const registry = new SlashCommandRegistry();
  registry.registerMany(builtinSlashCommands());

  for (const plugin of runtime.plugins) {
    try {
      const commands = await plugin.module?.slashCommands?.({
        cwd,
        manifest: plugin.manifest,
        services: runtime.services,
        tools: runtime.tools,
        providers: runtime.providers
      });
      registry.registerMany(commands ?? []);
    } catch {
      continue;
    }
  }

  const commands = registry.list();
  runtime.services.set<SlashCommand[]>("slashCommands", commands);
  await registry.loadRecent(cwd);
  return registry;
}
