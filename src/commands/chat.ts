import { readSlashInput } from "./slash/autocomplete/slashInput.js";
import { runFallbackAsk } from "./slash/commands/builtin.js";
import { createSlashRegistry } from "./slash/registry/createSlashRegistry.js";
import ora from "ora";
import { loadConfig } from "../config/loadConfig.js";
import { loadFileMentionEntries } from "../mentions/scanner/fileMentionCache.js";
import {
  readRecentFileMentions,
  recordPromptFileMentions
} from "../mentions/scanner/fileMentionRecent.js";
import { parseFileMentions } from "../mentions/parser/fileMentionParser.js";
import { createPluginRuntime } from "../plugins/core/pluginManager.js";
import { header, printMuted } from "../terminal/render.js";
import { TrustManager } from "../trust/manager/trustManager.js";
import { renderTrustState } from "../trust/ui/trustUi.js";
import { getErrorMessage } from "../utils/errors.js";

export async function chatCommand(cwd = process.cwd()): Promise<void> {
  console.log(header());
  const spinner = ora("Starting interactive session").start();
  const runtime = await createPluginRuntime(cwd);
  const slashRegistry = await createSlashRegistry(cwd, runtime);
  const config = await loadConfig(cwd);
  const fileEntries = await loadFileMentionEntries(cwd, config);
  const recentFiles = await readRecentFileMentions(cwd);
  const trustManager = new TrustManager();
  let trustState = await trustManager.state(cwd);
  let exitRequested = false;
  spinner.stop();
  renderTrustState(trustState);
  await runtime.hooks.onChatStart();

  try {
    while (!exitRequested) {
      const result = await readSlashInput({
        registry: slashRegistry,
        files: fileEntries,
        recentFiles,
        prompt: `orc [${trustLabel(trustState.level)}] > `
      });

      if (result.type === "interrupt" || result.type === "cancel") {
        printMuted("Session closed.");
        return;
      }

      if (!result.value) {
        continue;
      }

      try {
        await recordPromptFileMentions(cwd, result.value);
        const mentions = parseFileMentions(result.value).map((mention) => mention.value);

        if (mentions.length > 0) {
          runtime.services.set("lastFileMentions", mentions);
        }

        if (result.value.startsWith("/")) {
          const [name = "", ...rest] = result.value.split(/\s+/);
          const command = slashRegistry.get(name);

          if (!command) {
            printMuted(`Unknown slash command: ${name}`);
            continue;
          }

          await slashRegistry.recordUsage(cwd, command);
          await command.execute({
            cwd,
            args: rest.join(" ").trim(),
            runtime,
            requestExit: () => {
              exitRequested = true;
            }
          });
          trustState = await trustManager.state(cwd);
        } else {
          await runFallbackAsk(
            {
              cwd,
              args: result.value,
              runtime,
              requestExit: () => {
                exitRequested = true;
              }
            },
            result.value
          );
          trustState = await trustManager.state(cwd);
        }
      } catch (error) {
        printMuted(getErrorMessage(error));
      }
    }

    printMuted("Session closed.");
  } finally {
    await runtime.hooks.onShutdown();
  }
}

function trustLabel(level: string): string {
  if (level === "trusted-project") {
    return "TRUSTED PROJECT";
  }

  if (level === "trusted-folder") {
    return "TRUSTED FOLDER";
  }

  return "RESTRICTED";
}
