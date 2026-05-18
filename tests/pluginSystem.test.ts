import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { ProviderRegistry } from "../src/core/providerRegistry.js";
import { ServiceContainer } from "../src/core/serviceContainer.js";
import { ToolRegistry } from "../src/core/toolRegistry.js";
import { PluginLoader } from "../src/plugins/loader/pluginLoader.js";
import { readPluginManifest } from "../src/plugins/loader/pluginManifest.js";

describe("plugin system", () => {
  it("validates plugin manifests", async () => {
    const dir = await mkdtemp(join(tmpdir(), "orc-plugin-"));

    try {
      await writeFile(
        join(dir, "plugin.json"),
        JSON.stringify({ name: "sample", version: "1.0.0", entry: "./index.js" }),
        "utf8"
      );

      await expect(readPluginManifest(dir)).resolves.toMatchObject({ name: "sample" });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("installs local plugins and enables them", async () => {
    const dir = await mkdtemp(join(tmpdir(), "orc-plugin-install-"));
    const source = join(dir, "source");

    try {
      await writeFile(join(dir, ".gitkeep"), "", "utf8");
      await mkdir(source);
      await writeFile(
        join(source, "plugin.json"),
        JSON.stringify({ name: "local-plugin", version: "1.0.0", entry: "./index.js" }),
        "utf8"
      );
      await writeFile(join(source, "index.js"), "export default {};\n", "utf8");

      const loader = new PluginLoader({
        cwd: dir,
        services: new ServiceContainer(),
        tools: new ToolRegistry(),
        providers: new ProviderRegistry()
      });

      await expect(loader.install(source)).resolves.toBe("local-plugin");
      await expect(loader.listInstalled()).resolves.toEqual([
        expect.objectContaining({ enabled: true })
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
