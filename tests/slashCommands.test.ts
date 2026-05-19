import { describe, expect, it } from "vitest";
import { matchSlashCommands } from "../src/commands/slash/matcher/fuzzy.js";
import { SlashCommandRegistry } from "../src/commands/slash/registry/slashCommandRegistry.js";
import type { SlashCommand } from "../src/commands/slash/registry/types.js";

describe("slash command autocomplete", () => {
  it("ranks exact, prefix, and fuzzy matches", () => {
    const registry = createRegistry();

    expect(matchSlashCommands("/models", registry)[0]?.command.name).toBe("/models");
    expect(matchSlashCommands("/mo", registry).map((match) => match.command.name)).toEqual([
      "/models",
      "/model"
    ]);
    expect(matchSlashCommands("/mdl", registry)[0]?.command.name).toBe("/models");
    expect(matchSlashCommands("/plug", registry)[0]?.command.name).toBe("/plugins");
    expect(matchSlashCommands("/his", registry)[0]?.command.name).toBe("/history");
  });

  it("matches aliases", () => {
    const registry = createRegistry();

    expect(matchSlashCommands("/h", registry)[0]?.command.name).toBe("/help");
    expect(matchSlashCommands("/q", registry)[0]?.command.name).toBe("/quit");
  });
});

function createRegistry(): SlashCommandRegistry {
  const registry = new SlashCommandRegistry();
  const execute = (): void => undefined;
  const commands: SlashCommand[] = [
    { name: "/help", description: "Help", aliases: ["/h"], category: "Session", execute },
    {
      name: "/models",
      description: "Models",
      aliases: ["/m"],
      category: "AI",
      priority: 20,
      execute
    },
    { name: "/model", description: "Model", category: "AI", priority: 10, execute },
    { name: "/mcp", description: "MCP", category: "MCP", execute },
    { name: "/plugins", description: "Plugins", category: "Plugins", execute },
    { name: "/history", description: "History", category: "Session", execute },
    { name: "/quit", description: "Quit", aliases: ["/q"], category: "Session", execute },
    { name: "/exit", description: "Exit", category: "Session", execute }
  ];

  registry.registerMany(commands);
  return registry;
}
