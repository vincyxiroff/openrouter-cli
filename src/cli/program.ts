import { Command } from "commander";
import { askCommand } from "../commands/ask.js";
import { chatCommand } from "../commands/chat.js";
import { commitCommand } from "../commands/commit.js";
import { contextCommand } from "../commands/context.js";
import type { AutoApprovalOptions } from "../core/autoApproval.js";
import { doctorCommand } from "../commands/doctor.js";
import { editCommand } from "../commands/edit.js";
import { explainCommand } from "../commands/explain.js";
import { initCommand } from "../commands/init.js";
import { agentsCommand, agentsInitCommand, workflowCommand } from "../commands/agents.js";
import { dashboardCommand } from "../commands/dashboard.js";
import {
  mcpAddCommand,
  mcpConnectCommand,
  mcpDisconnectCommand,
  mcpListCommand,
  mcpRemoveCommand,
  mcpStatusCommand
} from "../commands/mcp.js";
import { modelsCommand } from "../commands/models.js";
import type { ModelsCommandOptions } from "../commands/models.js";
import {
  pluginDisableCommand,
  pluginEnableCommand,
  pluginInstallCommand,
  pluginRemoveCommand,
  pluginSearchCommand,
  pluginUpdateCommand,
  pluginsCommand
} from "../commands/plugins.js";
import { providerSetupCommand, providersCommand } from "../commands/providers.js";
import { setupCommand, shouldRunFirstSetup } from "../commands/setup.js";
import type { SetupOptions } from "../commands/setup.js";
import { teamCommand, teamInitCommand } from "../commands/team.js";
import {
  trustCommand,
  trustListCommand,
  trustRemoveCommand,
  trustResetCommand
} from "../commands/trust.js";
import { updateCommand } from "../commands/update.js";
import { voiceCommand } from "../commands/voice.js";
import type { VoiceOptions } from "../commands/voice.js";
import { migrateConfig } from "../config/migrateConfig.js";
import { packageVersion } from "../config/packageInfo.js";
import { printError } from "../terminal/render.js";
import { maybeAutoUpdate } from "../update/autoUpdate.js";
import { getErrorMessage } from "../utils/errors.js";
import { registerPluginCommands } from "../plugins/core/pluginManager.js";
import { TrustManager } from "../trust/manager/trustManager.js";
import { promptForTrust } from "../trust/ui/trustUi.js";

export async function runCli(argv: string[]): Promise<void> {
  const program = new Command();

  program
    .name("orc")
    .description("The AI coding CLI powered by OpenRouter.")
    .version(packageVersion())
    .action(async () => {
      if (await shouldRunFirstSetup()) {
        await setupCommand();
      } else {
        await migrateConfig();
      }

      await maybeAutoUpdate();
      const trust = new TrustManager();
      const state = await trust.state();

      if (state.level === "restricted") {
        const choice = await promptForTrust(process.cwd());

        if (choice === "cancel") {
          return;
        }

        if (choice === "project") {
          await trust.trustProject();
        }

        if (choice === "folder") {
          await trust.trustFolder();
        }
      }

      await chatCommand();
    });

  program
    .command("ask")
    .argument("<prompt>")
    .description("Run a single-shot AI question")
    .option("-y, --yes", "auto-accept edits and commands")
    .option("--auto-edits", "auto-accept file edits")
    .option("--auto-cmds", "auto-accept command execution")
    .action(async (prompt: string, options: AutoApprovalOptions) =>
      askCommand(prompt, process.cwd(), options)
    );

  program
    .command("edit")
    .argument("<task>")
    .description("Run AI coding mode with diff approval")
    .option("-y, --yes", "auto-accept edits and commands")
    .option("--auto-edits", "auto-accept file edits")
    .option("--auto-cmds", "auto-accept command execution")
    .action(async (task: string, options: AutoApprovalOptions) =>
      editCommand(task, process.cwd(), options)
    );

  program
    .command("explain")
    .description("Explain the current codebase")
    .action(async () => explainCommand());

  program
    .command("context")
    .argument("[query]", "optional context query", "project overview")
    .description("Show files selected for context")
    .action(async (query: string) => contextCommand(query));

  program
    .command("models")
    .description("List available OpenRouter models")
    .option("--free", "show only free models")
    .option("--search <query>", "search model id, name, provider, or description")
    .option("--provider <provider>", "filter by provider")
    .option("--context <tokens>", "minimum context length")
    .option("--multimodal", "show only multimodal models")
    .option("--reasoning", "show only reasoning-capable models")
    .option("--page <number>", "page number")
    .option("--limit <number>", "models per page")
    .option("--json", "print raw JSON")
    .action(async (options: ModelsCommandOptions) => modelsCommand(options));

  program
    .command("doctor")
    .description("Diagnose configuration and connectivity")
    .action(async () => doctorCommand());

  program
    .command("init")
    .description("Create initial configuration")
    .action(async () => initCommand());

  program
    .command("setup")
    .description("Run first-run setup")
    .option("--reset", "delete configuration and run setup again")
    .option("--model", "change only the default model")
    .option("--key", "change only the OpenRouter API key")
    .action(async (options: SetupOptions) => setupCommand(options));

  program
    .command("commit")
    .description("Generate an AI commit message")
    .action(async () => commitCommand());

  program
    .command("update")
    .description("Check latest npm version")
    .action(async () => updateCommand());

  program
    .command("plugins")
    .description("List installed plugins")
    .action(async () => pluginsCommand());

  const trust = program.command("trust").description("Manage project trust");

  trust
    .argument("[action]", "status, project, folder, remove, reset, or list")
    .action(async (action?: string) => trustCommand(action));
  trust
    .command("list")
    .description("List trusted projects and folders")
    .action(async () => trustListCommand());
  trust
    .command("remove")
    .description("Remove trust for the current project or folder")
    .action(async () => trustRemoveCommand());
  trust
    .command("reset")
    .description("Reset all trust entries")
    .action(async () => trustResetCommand());

  const plugin = program.command("plugin").description("Manage plugins");

  plugin
    .command("list")
    .description("List installed plugins")
    .action(async () => pluginsCommand());
  plugin
    .command("search")
    .argument("[query]", "search query", "")
    .description("Search plugin registry")
    .action(async (query: string) => pluginSearchCommand(query));
  plugin
    .command("install")
    .argument("<name>")
    .description("Install a local plugin")
    .action(async (name: string) => pluginInstallCommand(name));
  plugin
    .command("remove")
    .argument("<name>")
    .description("Remove a plugin")
    .action(async (name: string) => pluginRemoveCommand(name));
  plugin
    .command("update")
    .argument("<name>")
    .description("Check plugin registry updates")
    .action(async (name: string) => pluginUpdateCommand(name));
  plugin
    .command("enable")
    .argument("<name>")
    .description("Enable a plugin")
    .action(async (name: string) => pluginEnableCommand(name));
  plugin
    .command("disable")
    .argument("<name>")
    .description("Disable a plugin")
    .action(async (name: string) => pluginDisableCommand(name));

  const mcp = program.command("mcp").description("Manage MCP servers");

  mcp
    .command("list")
    .description("List MCP servers")
    .action(async () => mcpListCommand());
  mcp
    .command("status")
    .description("Show MCP status")
    .action(async () => mcpStatusCommand());
  mcp
    .command("connect")
    .argument("[name]")
    .description("Connect and discover MCP tools")
    .action(async (name?: string) => mcpConnectCommand(name));
  mcp
    .command("disconnect")
    .argument("[name]")
    .description("Disconnect MCP servers")
    .action((name?: string) => mcpDisconnectCommand(name));
  mcp
    .command("add")
    .argument("<name>")
    .argument("<commandOrUrl>")
    .argument("[args...]")
    .description("Add an MCP server")
    .action(async (name: string, commandOrUrl: string, args: string[]) =>
      mcpAddCommand(name, commandOrUrl, args)
    );
  mcp
    .command("remove")
    .argument("<name>")
    .description("Remove an MCP server")
    .action(async (name: string) => mcpRemoveCommand(name));

  program
    .command("providers")
    .description("List AI providers")
    .action(async () => providersCommand());

  program
    .command("provider")
    .description("Manage AI provider")
    .command("setup")
    .description("Configure AI provider")
    .action(async () => providerSetupCommand());

  program
    .command("voice")
    .description("Start voice mode")
    .option("--model <model>", "speech-to-text model")
    .action(async (options: VoiceOptions) => voiceCommand(options));

  program
    .command("agents")
    .description("List agent workflow roles")
    .action(async () => agentsCommand());

  program
    .command("workflow")
    .argument("<task>")
    .description("Run multi-agent workflow plan")
    .action(async (task: string) => workflowCommand(task));

  program
    .command("agents:init")
    .description("Create agents config")
    .action(async () => agentsInitCommand());

  program
    .command("dashboard")
    .description("Start local dashboard")
    .action(async () => dashboardCommand());

  program
    .command("team")
    .description("Show team collaboration status")
    .action(async () => teamCommand());

  program
    .command("team:init")
    .description("Create team config")
    .action(async () => teamInitCommand());

  await registerPluginCommands(program);

  try {
    await program.parseAsync(argv);
  } catch (error) {
    printError(getErrorMessage(error));
    process.exitCode = 1;
  }
}
