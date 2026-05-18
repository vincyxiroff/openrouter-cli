import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { readAgentsConfig, writeAgentsConfig } from "../src/agents/agentConfig.js";
import { defaultAgentsConfig } from "../src/agents/types.js";
import { readTeamConfig, writeTeamConfig } from "../src/team/teamConfig.js";
import { defaultTeamConfig } from "../src/team/types.js";

describe("roadmap configs", () => {
  it("writes agents config", async () => {
    const dir = await mkdtemp(join(tmpdir(), "orc-agents-"));

    try {
      await writeAgentsConfig(dir, defaultAgentsConfig);

      await expect(readAgentsConfig(dir)).resolves.toEqual(defaultAgentsConfig);
      await expect(readFile(join(dir, ".openrouter-cli/agents.json"), "utf8")).resolves.toContain(
        "Planner Agent"
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("writes team config", async () => {
    const dir = await mkdtemp(join(tmpdir(), "orc-team-"));

    try {
      await writeTeamConfig(dir, defaultTeamConfig);
      await expect(readTeamConfig(dir)).resolves.toEqual(defaultTeamConfig);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
