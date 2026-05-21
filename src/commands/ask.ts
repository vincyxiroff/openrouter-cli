import ora from "ora";
import { contextPrompt, systemPrompt } from "../ai/prompts.js";
import { runToolLoop } from "../agents/toolLoop.js";
import { loadConfig } from "../config/loadConfig.js";
import { buildContext } from "../context/fileScanner.js";
import { resolveAutoApproval, type AutoApprovalOptions } from "../core/autoApproval.js";
import { appendHistory, readHistory } from "../memory/sessionMemory.js";
import { MentionContextResolver } from "../mentions/context/mentionContextResolver.js";
import { createPluginRuntime } from "../plugins/core/pluginManager.js";
import { createAiProvider } from "../providers/registry/providerRegistry.js";
import { printInfo, printMuted } from "../terminal/render.js";
import { TrustGuard } from "../trust/guards/trustGuard.js";

export async function askCommand(
  prompt: string,
  cwd = process.cwd(),
  options: AutoApprovalOptions = {}
): Promise<void> {
  const trustGuard = new TrustGuard();
  const trustState = await trustGuard.state(cwd);
  const config = await trustGuard.applyConfigRestrictions(cwd, await loadConfig(cwd));
  const auto = resolveAutoApproval(config, trustState.level === "restricted" ? {} : options);

  if (auto.commands) {
    printInfo("AUTO MODE ENABLED");
    printMuted("Edits: OFF");
    printMuted("Commands: ON");
  }

  const spinner = ora("Building context").start();
  const mentionedFiles = await new MentionContextResolver(cwd, config).resolvePrompt(prompt);
  const discoveredFiles = shouldBuildProjectContext(prompt, mentionedFiles.length)
    ? await buildContext(cwd, config, prompt)
    : [];
  const files = mergeContextFiles(mentionedFiles, discoveredFiles, config.maxContextFiles);
  const history = await readHistory(cwd);
  const runtime = await createPluginRuntime(cwd);
  spinner.stop();
  const messages = [
    { role: "system" as const, content: systemPrompt() },
    ...history,
    { role: "user" as const, content: `Context:\n${contextPrompt(files)}\n\nQuestion:\n${prompt}` }
  ];

  const provider = createAiProvider(config.provider);
  const result = await runToolLoop({
    provider,
    model: config.model,
    temperature: config.temperature,
    messages,
    cwd,
    allowCommandExecution: config.allowCommandExecution,
    autoAcceptFileWrites: auto.edits,
    autoAcceptCommands: auto.commands,
    maxToolIterations: config.maxToolIterations,
    onBeforeRequest: (requestMessages) => runtime.hooks.onBeforeRequest(requestMessages)
  });

  await appendHistory(cwd, [
    { role: "user", content: prompt },
    { role: "assistant", content: result.finalAnswer }
  ]);
  await runtime.hooks.onAfterRequest(result.finalAnswer);

  if (result.iterations > 0) {
    printInfo("Tool calls processed.");
  }
}

function mergeContextFiles(
  priorityFiles: Awaited<ReturnType<MentionContextResolver["resolvePrompt"]>>,
  discoveredFiles: Awaited<ReturnType<typeof buildContext>>,
  limit: number
): Awaited<ReturnType<typeof buildContext>> {
  const seen = new Set<string>();
  const files = [];

  for (const file of [...priorityFiles, ...discoveredFiles]) {
    if (seen.has(file.path)) {
      continue;
    }

    seen.add(file.path);
    files.push(file);
  }

  return files.slice(0, limit);
}

function shouldBuildProjectContext(prompt: string, mentionCount: number): boolean {
  if (mentionCount > 0) {
    return true;
  }

  const normalized = prompt.toLowerCase();
  const projectTerms = [
    "code",
    "project",
    "repo",
    "repository",
    "file",
    "folder",
    "src",
    "bug",
    "error",
    "typescript",
    "javascript",
    "function",
    "class",
    "explain",
    "analyze",
    "fix",
    "debug",
    "test",
    "build"
  ];

  return projectTerms.some((term) => normalized.includes(term));
}
