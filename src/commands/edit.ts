import { confirm } from "@inquirer/prompts";
import ora from "ora";
import { editPrompt } from "../ai/prompts.js";
import { loadConfig } from "../config/loadConfig.js";
import { buildContext } from "../context/fileScanner.js";
import { resolveAutoApproval, type AutoApprovalOptions } from "../core/autoApproval.js";
import { applyChanges } from "../filesystem/applyChanges.js";
import { renderPlanDiff } from "../filesystem/diff.js";
import { parseEditPlan } from "../filesystem/editPlan.js";
import { appendHistory } from "../memory/sessionMemory.js";
import { MentionContextResolver } from "../mentions/context/mentionContextResolver.js";
import { createPluginRuntime } from "../plugins/core/pluginManager.js";
import { createAiProvider } from "../providers/registry/providerRegistry.js";
import { validateCommand } from "../safety/commands.js";
import { runShellCommand } from "../terminal/runCommand.js";
import { printInfo, printMuted } from "../terminal/render.js";
import { TrustGuard } from "../trust/guards/trustGuard.js";
import { extractJsonObject } from "../utils/json.js";

export async function editCommand(
  task: string,
  cwd = process.cwd(),
  options: AutoApprovalOptions = {}
): Promise<void> {
  const trustGuard = new TrustGuard();
  await trustGuard.ensureTrusted(cwd, "editing");
  const config = await trustGuard.applyConfigRestrictions(cwd, await loadConfig(cwd));
  const auto = resolveAutoApproval(config, options);

  if (auto.edits || auto.commands) {
    printInfo("AUTO MODE ENABLED");
    printMuted(`Edits: ${auto.edits ? "ON" : "OFF"}`);
    printMuted(`Commands: ${auto.commands ? "ON" : "OFF"}`);
  }

  const spinner = ora("Analyzing project").start();
  const mentionedFiles = await new MentionContextResolver(cwd, config).resolvePrompt(task);
  const discoveredFiles = await buildContext(cwd, config, task);
  const files = mergeContextFiles(mentionedFiles, discoveredFiles, config.maxContextFiles);
  spinner.text = "Requesting edit plan";
  const raw = await createAiProvider(config.provider).chat({
    model: config.model,
    temperature: config.temperature,
    messages: [{ role: "user", content: editPrompt(task, files) }]
  });
  spinner.stop();

  const plan = parseEditPlan(extractJsonObject(raw));
  printInfo(plan.summary);
  printMuted(plan.reasoning);
  console.log(await renderPlanDiff(cwd, plan));

  const apply = auto.edits
    ? true
    : await confirm({ message: "Apply these file changes?", default: false });

  if (!apply) {
    printMuted("No changes applied.");
    return;
  }

  if (auto.edits) {
    printInfo("Auto-applying edits...");
  }

  await applyChanges(cwd, plan);
  printInfo(auto.edits ? "Applied changes automatically" : "Changes applied.");

  if (plan.changes.length > 0) {
    printMuted("Modified files:");

    for (const change of plan.changes) {
      printInfo(`- ${change.path}`);
    }
  }

  await (await createPluginRuntime(cwd)).hooks.onFileEdit(plan.changes);

  for (const command of plan.commands) {
    const validation = validateCommand(command);

    if (!validation.ok) {
      printMuted(`Command blocked by safety policy and requires manual review: ${command}`);
      continue;
    }

    const run = auto.commands
      ? true
      : config.allowCommandExecution
        ? await confirm({ message: `Run command: ${command}?`, default: false })
        : false;

    if (!run) {
      printMuted(`Skipped command: ${command}`);
      continue;
    }

    if (auto.commands) {
      printInfo("Auto-running command...");
      printMuted(`Running: ${command}`);
    }

    const code = await runShellCommand(command, cwd);
    printMuted(`Command exited with code ${code}`);
  }

  await appendHistory(cwd, [
    { role: "user", content: task },
    { role: "assistant", content: JSON.stringify(plan) }
  ]);
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
