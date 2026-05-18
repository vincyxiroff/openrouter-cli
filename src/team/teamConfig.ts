import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { z } from "zod";
import { defaultTeamConfig } from "./types.js";
import type { TeamConfig } from "./types.js";

const teamPath = ".openrouter-cli/team.json";

const teamSchema = z.object({
  enabled: z.literal(false),
  endpoint: z.string().optional(),
  organization: z.string().optional()
});

export async function readTeamConfig(cwd: string): Promise<TeamConfig> {
  try {
    return teamSchema.parse(JSON.parse(await readFile(join(cwd, teamPath), "utf8")));
  } catch {
    return defaultTeamConfig;
  }
}

export async function writeTeamConfig(cwd: string, config: TeamConfig): Promise<void> {
  const path = join(cwd, teamPath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}
