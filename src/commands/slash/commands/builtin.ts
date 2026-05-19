import { input, select } from "@inquirer/prompts";
import { askCommand } from "../../ask.js";
import { commitCommand } from "../../commit.js";
import { contextCommand } from "../../context.js";
import { doctorCommand } from "../../doctor.js";
import { editCommand } from "../../edit.js";
import { explainCommand } from "../../explain.js";
import { mcpStatusCommand } from "../../mcp.js";
import { modelsCommand } from "../../models.js";
import { pluginsCommand } from "../../plugins.js";
import { providersCommand } from "../../providers.js";
import { setupCommand } from "../../setup.js";
import { trustCommand } from "../../trust.js";
import { loadConfig } from "../../../config/loadConfig.js";
import { readHistory } from "../../../memory/sessionMemory.js";
import { matchFileMentions } from "../../../mentions/matcher/fileMentionMatcher.js";
import { renderFileMentionSuggestions } from "../../../mentions/renderer/fileMentionRenderer.js";
import { loadFileMentionEntries } from "../../../mentions/scanner/fileMentionCache.js";
import { readRecentFileMentions } from "../../../mentions/scanner/fileMentionRecent.js";
import { printInfo, printMuted } from "../../../terminal/render.js";
import { theme } from "../../../terminal/theme.js";
import type { SlashCommand, SlashCommandContext } from "../registry/types.js";

export function builtinSlashCommands(): SlashCommand[] {
  return [
    {
      name: "/help",
      description: "Show slash commands",
      aliases: ["/h"],
      category: "Session",
      execute: ({ runtime }) => renderHelp(runtime.services.get("slashCommands"))
    },
    {
      name: "/models",
      description: "Browse models",
      aliases: ["/m"],
      category: "AI",
      priority: 20,
      execute: ({ cwd }) => modelsCommand({}, cwd)
    },
    {
      name: "/model",
      description: "Show current model",
      category: "AI",
      priority: 10,
      execute: showCurrentModel
    },
    {
      name: "/provider",
      description: "Show configured providers",
      category: "AI",
      execute: () => providersCommand()
    },
    {
      name: "/context",
      description: "Show loaded files",
      aliases: ["/c"],
      category: "Project",
      execute: showContext
    },
    {
      name: "/files",
      description: "Open file picker",
      category: "Project",
      execute: openFilePicker
    },
    {
      name: "/history",
      description: "Show session history",
      category: "Session",
      execute: showHistory
    },
    {
      name: "/clear",
      description: "Clear the terminal",
      category: "Session",
      execute: () => console.clear()
    },
    {
      name: "/reset",
      description: "Reset visible chat state",
      aliases: ["/r"],
      category: "Session",
      execute: () => printMuted("Start a fresh prompt. Persistent history is preserved.")
    },
    {
      name: "/trust",
      description: "Show or change project trust",
      category: "Configuration",
      execute: ({ cwd, args }) => trustCommand(args || "status", cwd)
    },
    {
      name: "/setup",
      description: "Run first-run setup",
      category: "Configuration",
      execute: ({ cwd }) => setupCommand({}, cwd)
    },
    {
      name: "/doctor",
      description: "Run diagnostics",
      category: "Development",
      execute: ({ cwd }) => doctorCommand(cwd)
    },
    {
      name: "/edit",
      description: "Run coding edit mode",
      category: "Development",
      execute: runEdit
    },
    {
      name: "/explain",
      description: "Explain the current project",
      category: "Development",
      execute: ({ cwd }) => explainCommand(cwd)
    },
    {
      name: "/commit",
      description: "Generate a commit message",
      category: "Development",
      execute: ({ cwd }) => commitCommand(cwd)
    },
    {
      name: "/plugins",
      description: "List installed plugins",
      category: "Plugins",
      execute: ({ cwd }) => pluginsCommand(cwd)
    },
    {
      name: "/mcp",
      description: "Show MCP status",
      category: "MCP",
      execute: ({ cwd }) => mcpStatusCommand(cwd)
    },
    {
      name: "/tools",
      description: "Show registered tools",
      category: "MCP",
      execute: showTools
    },
    {
      name: "/exit",
      description: "Exit openrouter-cli",
      category: "Session",
      execute: ({ requestExit }) => requestExit()
    },
    {
      name: "/quit",
      description: "Quit openrouter-cli",
      aliases: ["/q"],
      category: "Session",
      execute: ({ requestExit }) => requestExit()
    }
  ];
}

async function showCurrentModel({ cwd }: SlashCommandContext): Promise<void> {
  const config = await loadConfig(cwd);
  printInfo(config.model);
  printMuted(`Provider: ${config.provider}`);
}

async function showContext(context: SlashCommandContext): Promise<void> {
  if (context.runtime.services.has("lastFileMentions")) {
    const mentions = context.runtime.services.get<string[]>("lastFileMentions");

    if (mentions.length > 0) {
      printInfo("Mentioned files");

      for (const mention of mentions) {
        printMuted(`@${mention}`);
      }

      console.log("");
    }
  }

  await contextCommand(context.args || "project overview", context.cwd);
}

async function openFilePicker({ cwd }: SlashCommandContext): Promise<void> {
  const config = await loadConfig(cwd);
  const entries = await loadFileMentionEntries(cwd, config);
  const recent = await readRecentFileMentions(cwd);
  const query = await input({ message: "File query", default: "" });
  const matches = matchFileMentions(query, entries, recent, 12);

  if (matches.length === 0) {
    printMuted("No matching files.");
    return;
  }

  console.log(renderFileMentionSuggestions(matches, 0));
  const selected = await select({
    message: "Select file",
    choices: matches.map((match) => ({
      name: `${match.entry.path} ${match.entry.status ?? match.entry.type.toUpperCase()}`,
      value: match.entry.path
    }))
  });
  printInfo(`Selected @${selected}`);
}

async function showHistory({ cwd }: SlashCommandContext): Promise<void> {
  const history = await readHistory(cwd);

  if (history.length === 0) {
    printMuted("No session history yet.");
    return;
  }

  for (const message of history.slice(-12)) {
    const label = message.role === "assistant" ? "AI" : message.role;
    console.log(`${theme.accent(label)} ${theme.muted(message.content.slice(0, 300))}`);
  }
}

async function runEdit(context: SlashCommandContext): Promise<void> {
  const task =
    context.args ||
    (await input({
      message: "Edit task",
      required: true
    }));

  await editCommand(task, context.cwd);
}

function showTools({ runtime }: SlashCommandContext): void {
  const tools = runtime.tools.list();

  if (tools.length === 0) {
    printMuted("No tools registered.");
    return;
  }

  for (const tool of tools) {
    console.log(`${theme.accent(tool.name)} ${theme.muted(tool.description)}`);
  }
}

function renderHelp(commands: SlashCommand[] | undefined): void {
  const entries = commands ?? builtinSlashCommands();

  for (const command of entries) {
    const aliases = command.aliases?.length ? ` ${theme.muted(command.aliases.join(", "))}` : "";
    console.log(`${theme.accent(command.name)}${aliases}`);
    printMuted(`  ${command.description}`);
  }
}

export async function runFallbackAsk(context: SlashCommandContext, prompt: string): Promise<void> {
  await askCommand(prompt, context.cwd);
}
