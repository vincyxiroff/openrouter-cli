import type { Command } from "commander";
import type { ChatMessage, FileChange } from "../../core/types.js";
import type { ProviderRegistry } from "../../core/providerRegistry.js";
import type { ServiceContainer } from "../../core/serviceContainer.js";
import type { ToolRegistry } from "../../core/toolRegistry.js";
import type { SlashCommand } from "../../commands/slash/registry/types.js";

export type PluginManifest = {
  name: string;
  version: string;
  description?: string | undefined;
  author?: string | undefined;
  entry: string;
};

export type PluginHooks = {
  onInit?: (context: PluginContext) => void | Promise<void>;
  onChatStart?: (context: PluginContext) => void | Promise<void>;
  onBeforeRequest?: (messages: ChatMessage[], context: PluginContext) => void | Promise<void>;
  onAfterRequest?: (response: string, context: PluginContext) => void | Promise<void>;
  onFileEdit?: (changes: FileChange[], context: PluginContext) => void | Promise<void>;
  onCommandExecution?: (command: string, context: PluginContext) => void | Promise<void>;
  onShutdown?: (context: PluginContext) => void | Promise<void>;
};

export type PluginContext = {
  cwd: string;
  manifest: PluginManifest;
  services: ServiceContainer;
  tools: ToolRegistry;
  providers: ProviderRegistry;
};

export type PluginModule = {
  commands?: (program: Command, context: PluginContext) => void | Promise<void>;
  slashCommands?: (context: PluginContext) => SlashCommand[] | Promise<SlashCommand[]>;
  hooks?: PluginHooks;
  tools?: (registry: ToolRegistry, context: PluginContext) => void | Promise<void>;
  providers?: (registry: ProviderRegistry, context: PluginContext) => void | Promise<void>;
};

export type LoadedPlugin = {
  manifest: PluginManifest;
  enabled: boolean;
  path: string;
  module?: PluginModule;
  error?: string;
};
