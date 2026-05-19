import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config/loadConfig.js";
import { migrateConfig } from "../src/config/migrateConfig.js";
import { getAppDataDir, getAppDataPaths } from "../src/storage/paths/appDataPaths.js";
import { getProjectDataPaths } from "../src/storage/paths/projectDataPaths.js";

describe("storage paths", () => {
  it("creates app data paths outside the project", async () => {
    const dir = await getAppDataDir();
    const paths = await getAppDataPaths();

    expect(dir).toContain("openrouter-cli");
    expect(paths.trusted).toBe(join(dir, "trusted.json"));
    expect(paths.globalConfig).toBe(join(dir, "global-config.json"));
    expect(paths.modelsCache).toBe(join(dir, "models-cache.json"));
    expect(paths.pluginRegistryCache).toBe(join(dir, "cache", "plugin-registry.json"));
  });

  it("keeps project-local paths under .openrouter-cli", () => {
    const cwd = join(tmpdir(), "orc-storage-project");
    const paths = getProjectDataPaths(cwd);

    expect(paths.history).toBe(join(cwd, ".openrouter-cli", "history.json"));
    expect(paths.projectConfig).toBe(join(cwd, ".openrouter-cli", "project-config.json"));
    expect(paths.filesCache).toBe(join(cwd, ".openrouter-cli", "files-cache.json"));
    expect(paths.mcp).toBe(join(cwd, ".openrouter-cli", "mcp.json"));
    expect(paths.plugins).toBe(join(cwd, ".openrouter-cli", "plugins.json"));
  });

  it("loads legacy config and migrates to project config", async () => {
    const cwd = join(tmpdir(), `orc-storage-${Date.now()}`);
    await mkdir(cwd, { recursive: true });
    await writeFile(
      join(cwd, ".openrouter-cli.json"),
      `${JSON.stringify({ model: "test/model" }, null, 2)}\n`,
      "utf8"
    );

    expect((await loadConfig(cwd)).model).toBe("test/model");
    await migrateConfig(cwd);
    await expect(readFile(getProjectDataPaths(cwd).projectConfig, "utf8")).resolves.toContain(
      "test/model"
    );
  });
});
