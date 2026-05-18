import type { ProviderRegistry } from "../../core/providerRegistry.js";
import type { ServiceContainer } from "../../core/serviceContainer.js";
import type { ToolRegistry } from "../../core/toolRegistry.js";
import type { ChatMessage, FileChange } from "../../core/types.js";
import type { LoadedPlugin, PluginContext, PluginHooks } from "../types/plugin.js";

export type PluginHookName = keyof PluginHooks;

export class PluginHookRunner {
  constructor(
    private readonly cwd: string,
    private readonly services: ServiceContainer,
    private readonly tools: ToolRegistry,
    private readonly providers: ProviderRegistry,
    private readonly plugins: LoadedPlugin[]
  ) {}

  async onChatStart(): Promise<void> {
    await this.run("onChatStart", []);
  }

  async onBeforeRequest(messages: ChatMessage[]): Promise<void> {
    await this.run("onBeforeRequest", [messages]);
  }

  async onAfterRequest(response: string): Promise<void> {
    await this.run("onAfterRequest", [response]);
  }

  async onFileEdit(changes: FileChange[]): Promise<void> {
    await this.run("onFileEdit", [changes]);
  }

  async onCommandExecution(command: string): Promise<void> {
    await this.run("onCommandExecution", [command]);
  }

  async onShutdown(): Promise<void> {
    await this.run("onShutdown", []);
  }

  private async run(name: PluginHookName, args: unknown[]): Promise<void> {
    for (const plugin of this.plugins) {
      const hook = plugin.module?.hooks?.[name] as
        | ((...args: unknown[]) => Promise<void> | void)
        | undefined;

      if (!hook) {
        continue;
      }

      try {
        await Promise.race([
          hook(...args, this.context(plugin)),
          new Promise<never>((_, reject) => {
            setTimeout(
              () => reject(new Error(`Plugin hook timed out: ${plugin.manifest.name}.${name}`)),
              5_000
            );
          })
        ]);
      } catch {
        continue;
      }
    }
  }

  private context(plugin: LoadedPlugin): PluginContext {
    return {
      cwd: this.cwd,
      manifest: plugin.manifest,
      services: this.services,
      tools: this.tools,
      providers: this.providers
    };
  }
}
