import { describe, expect, it } from "vitest";
import { normalizeConfig } from "../src/config/migrateConfig.js";

describe("config migration", () => {
  it("adds default fields without replacing existing values", () => {
    const config = normalizeConfig({
      model: "qwen/qwen3-coder:free",
      temperature: 0,
      ignoredPaths: ["custom-cache"]
    });

    expect(config.model).toBe("qwen/qwen3-coder:free");
    expect(config.temperature).toBe(0);
    expect(config.provider).toBe("openrouter");
    expect(config.ignoredPaths).toContain("custom-cache");
    expect(config.ignoredPaths).toContain("node_modules");
    expect(config.ignoredPaths).toContain(".env");
  });
});
