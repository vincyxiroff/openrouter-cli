import { describe, expect, it } from "vitest";
import { packageVersion } from "../src/config/packageInfo.js";
import { header } from "../src/terminal/render.js";

describe("terminal rendering", () => {
  it("shows the installed CLI version in the header", () => {
    expect(header()).toContain(`openrouter-cli v${packageVersion()}`);
  });

  it("shows update availability in the header", () => {
    expect(
      header({
        currentVersion: "1.2.3",
        latestVersion: "1.2.4",
        updateAvailable: true
      })
    ).toContain("(update available: v1.2.4)");
  });
});
