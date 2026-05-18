import { readAgentsConfig, writeAgentsConfig } from "../agents/agentConfig.js";
import { defaultAgentsConfig } from "../agents/types.js";
import { printInfo, printMuted } from "../terminal/render.js";

export async function agentsCommand(cwd = process.cwd()): Promise<void> {
  const config = await readAgentsConfig(cwd);
  printInfo(`Agent workflow mode: ${config.mode}`);

  for (const agent of config.agents) {
    console.log(`${agent.name} ${agent.role}`);
  }
}

export async function workflowCommand(task: string, cwd = process.cwd()): Promise<void> {
  const config = await readAgentsConfig(cwd);
  printInfo(`Workflow: ${task}`);

  for (const agent of config.agents) {
    printMuted(`${agent.name}: ${agent.prompt}`);
  }
}

export async function agentsInitCommand(cwd = process.cwd()): Promise<void> {
  await writeAgentsConfig(cwd, defaultAgentsConfig);
  printInfo("Created .openrouter-cli/agents.json");
}
