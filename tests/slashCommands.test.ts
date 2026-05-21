import { describe, expect, it } from "vitest";
import { formatInputPreview } from "../src/commands/slash/autocomplete/slashInput.js";
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

  it("compacts pasted multiline input while preserving full mode", () => {
    const paste = ["migliora @index.html", "stdout: first line", "stdout: second line"].join("\n");

    expect(formatInputPreview(paste, "compact", 80).text).toContain("[pasted: 3 lines");
    expect(formatInputPreview(paste, "full", 80)).toEqual({
      text: paste,
      compacted: false
    });
  });

  it("can show a command output tail for pasted terminal output", () => {
    const paste = Array.from({ length: 20 }, (_, index) => `line ${index + 1}`).join("\n");
    const preview = formatInputPreview(paste, "output", 80).text;

    expect(preview).toContain("showing last 12 of 20 lines");
    expect(preview).toContain("line 20");
    expect(preview).not.toContain("line 1\n");
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
