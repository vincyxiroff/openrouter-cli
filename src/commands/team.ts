import { readTeamConfig, writeTeamConfig } from "../team/teamConfig.js";
import { defaultTeamConfig } from "../team/types.js";
import { printInfo, printMuted } from "../terminal/render.js";

export async function teamCommand(cwd = process.cwd()): Promise<void> {
  const config = await readTeamConfig(cwd);
  printInfo("Team collaboration architecture is prepared.");
  printMuted(`Enabled: ${config.enabled}`);
}

export async function teamInitCommand(cwd = process.cwd()): Promise<void> {
  await writeTeamConfig(cwd, defaultTeamConfig);
  printInfo("Created .openrouter-cli/team.json");
}
