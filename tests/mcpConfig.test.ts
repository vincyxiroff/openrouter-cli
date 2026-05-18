import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { readMcpConfig, removeMcpServer, upsertMcpServer } from "../src/mcp/registry/mcpConfig.js";
import { McpToolRegistry } from "../src/mcp/tools/mcpToolRegistry.js";

describe("mcp config", () => {
  it("adds and removes servers", async () => {
    const dir = await mkdtemp(join(tmpdir(), "orc-mcp-"));

    try {
      await upsertMcpServer(dir, {
        name: "filesystem",
        command: "npx",
        args: ["server"],
        enabled: true
      });

      await expect(readMcpConfig(dir)).resolves.toMatchObject({
        servers: [expect.objectContaining({ name: "filesystem" })]
      });

      await removeMcpServer(dir, "filesystem");
      await expect(readMcpConfig(dir)).resolves.toEqual({ servers: [] });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("names discovered tools by server", () => {
    const registry = new McpToolRegistry();
    registry.register({ name: "github", enabled: true, command: "mcp" }, [
      { name: "create_issue" }
    ]);

    expect(registry.list()[0]?.name).toBe("github.create_issue");
  });
});
