import { confirm } from "@inquirer/prompts";
import ora from "ora";
import { OpenRouterClient } from "../ai/openrouter.js";
import { editPrompt } from "../ai/prompts.js";
import { loadConfig, readApiKey } from "../config/loadConfig.js";
import { buildContext } from "../context/fileScanner.js";
import { applyChanges } from "../filesystem/applyChanges.js";
import { renderPlanDiff } from "../filesystem/diff.js";
import { parseEditPlan } from "../filesystem/editPlan.js";
import { appendHistory } from "../memory/sessionMemory.js";
import { runShellCommand } from "../terminal/runCommand.js";
import { printInfo, printMuted } from "../terminal/render.js";
import { extractJsonObject } from "../utils/json.js";
import { UserFacingError } from "../utils/errors.js";

export async function editCommand(task: string, cwd = process.cwd()): Promise<void> {
  const config = await loadConfig(cwd);
  const apiKey = readApiKey();

  if (!apiKey) {
    throw new UserFacingError("Missing OPENROUTER_API_KEY");
  }

  const spinner = ora("Analyzing project").start();
  const files = await buildContext(cwd, config, task);
  spinner.text = "Requesting edit plan";
  const raw = await new OpenRouterClient().chat({
    apiKey,
    model: config.model,
    temperature: config.temperature,
    messages: [{ role: "user", content: editPrompt(task, files) }]
  });
  spinner.stop();

  const plan = parseEditPlan(extractJsonObject(raw));
  printInfo(plan.summary);
  printMuted(plan.reasoning);
  console.log(await renderPlanDiff(cwd, plan));

  const apply = await confirm({ message: "Apply these file changes?", default: false });

  if (!apply) {
    printMuted("No changes applied.");
    return;
  }

  await applyChanges(cwd, plan);
  printInfo("Changes applied.");

  for (const command of plan.commands) {
    const run = config.allowCommandExecution
      ? await confirm({ message: `Run command: ${command}?`, default: false })
      : false;

    if (!run) {
      printMuted(`Skipped command: ${command}`);
      continue;
    }

    const code = await runShellCommand(command, cwd);
    printMuted(`Command exited with code ${code}`);
  }

  await appendHistory(cwd, [
    { role: "user", content: task },
    { role: "assistant", content: JSON.stringify(plan) }
  ]);
}
