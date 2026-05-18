import { Command } from "commander";
import { askCommand } from "../commands/ask.js";
import { chatCommand } from "../commands/chat.js";
import { commitCommand } from "../commands/commit.js";
import { contextCommand } from "../commands/context.js";
import { doctorCommand } from "../commands/doctor.js";
import { editCommand } from "../commands/edit.js";
import { explainCommand } from "../commands/explain.js";
import { initCommand } from "../commands/init.js";
import { modelsCommand } from "../commands/models.js";
import type { ModelsCommandOptions } from "../commands/models.js";
import { setupCommand, shouldRunFirstSetup } from "../commands/setup.js";
import type { SetupOptions } from "../commands/setup.js";
import { updateCommand } from "../commands/update.js";
import { printError } from "../terminal/render.js";
import { getErrorMessage } from "../utils/errors.js";

export async function runCli(argv: string[]): Promise<void> {
  const program = new Command();

  program
    .name("orc")
    .description("The AI coding CLI powered by OpenRouter.")
    .version("0.1.0")
    .action(async () => {
      if (await shouldRunFirstSetup()) {
        await setupCommand();
      }

      await chatCommand();
    });

  program
    .command("ask")
    .argument("<prompt>")
    .description("Run a single-shot AI question")
    .action(async (prompt: string) => askCommand(prompt));

  program
    .command("edit")
    .argument("<task>")
    .description("Run AI coding mode with diff approval")
    .action(async (task: string) => editCommand(task));

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

  try {
    await program.parseAsync(argv);
  } catch (error) {
    printError(getErrorMessage(error));
    process.exitCode = 1;
  }
}
