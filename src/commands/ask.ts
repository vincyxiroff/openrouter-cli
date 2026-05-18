import { confirm } from "@inquirer/prompts";
import ora from "ora";
import { contextPrompt, systemPrompt } from "../ai/prompts.js";
import { loadConfig } from "../config/loadConfig.js";
import { buildContext } from "../context/fileScanner.js";
import { appendHistory, readHistory } from "../memory/sessionMemory.js";
import { createPluginRuntime } from "../plugins/core/pluginManager.js";
import { createAiProvider } from "../providers/registry/providerRegistry.js";
import { printInfo, printMuted, renderMarkdown } from "../terminal/render.js";
import { runShellCommand } from "../terminal/runCommand.js";
import {
  isShellToolCall,
  parseLongcatToolCalls,
  stripLongcatToolCalls
} from "../tools/toolCalls.js";

export async function askCommand(prompt: string, cwd = process.cwd()): Promise<void> {
  const config = await loadConfig(cwd);

  const spinner = ora("Building context").start();
  const files = await buildContext(cwd, config, prompt);
  const history = await readHistory(cwd);
  const runtime = await createPluginRuntime(cwd);
  spinner.text = "Requesting response";
  const messages = [
    { role: "system" as const, content: systemPrompt() },
    ...history,
    { role: "user" as const, content: `Context:\n${contextPrompt(files)}\n\nQuestion:\n${prompt}` }
  ];
  await runtime.hooks.onBeforeRequest(messages);

  const provider = createAiProvider(config.provider);
  const answer = await provider.chat({
    model: config.model,
    temperature: config.temperature,
    messages
  });
  spinner.stop();

  const toolCalls = parseLongcatToolCalls(answer);
  const text = stripLongcatToolCalls(answer);

  if (text) {
    console.log(renderMarkdown(text));
  }

  for (const call of toolCalls) {
    if (!isShellToolCall(call)) {
      printMuted(`Skipped unsupported tool: ${call.name}`);
      continue;
    }

    const command = call.input.command;

    if (!command) {
      printMuted("Skipped shell tool without command.");
      continue;
    }

    if (!config.allowCommandExecution) {
      printMuted(`Skipped command because command execution is disabled: ${command}`);
      continue;
    }

    const run = await confirm({
      message: `Run command: ${command}?`,
      default: false
    });

    if (!run) {
      printMuted(`Skipped command: ${command}`);
      continue;
    }

    const code = await runShellCommand(command, cwd);
    printMuted(`Command exited with code ${code}`);
  }

  if (toolCalls.length > 0) {
    printInfo("Tool calls processed.");
  }

  await appendHistory(cwd, [
    { role: "user", content: prompt },
    { role: "assistant", content: answer }
  ]);
  await runtime.hooks.onAfterRequest(answer);
}
