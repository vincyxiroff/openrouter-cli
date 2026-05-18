import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { z } from "zod";
import { defaultAgentsConfig } from "./types.js";
import type { AgentsConfig } from "./types.js";

const agentsPath = ".openrouter-cli/agents.json";

const agentsSchema = z.object({
  mode: z.enum(["sequential", "parallel"]).default("sequential"),
  agents: z.array(
    z.object({
      role: z.enum(["planner", "coder", "reviewer", "tester"]),
      name: z.string(),
      prompt: z.string()
    })
  )
});

export async function readAgentsConfig(cwd: string): Promise<AgentsConfig> {
  try {
    return agentsSchema.parse(JSON.parse(await readFile(join(cwd, agentsPath), "utf8")));
  } catch {
    return defaultAgentsConfig;
  }
}

export async function writeAgentsConfig(cwd: string, config: AgentsConfig): Promise<void> {
  const path = join(cwd, agentsPath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}
