import type { PluginRuntime } from "../../../plugins/core/pluginManager.js";

export type SlashCommandCategory =
  | "AI"
  | "Session"
  | "Project"
  | "Configuration"
  | "Development"
  | "Plugins"
  | "MCP";

export type SlashCommandContext = {
  cwd: string;
  args: string;
  runtime: PluginRuntime;
  requestExit: () => void;
};

export type SlashCommand = {
  name: `/${string}`;
  description: string;
  category: SlashCommandCategory;
  aliases?: `/${string}`[];
  priority?: number;
  execute: (context: SlashCommandContext) => Promise<void> | void;
};
