import { describe, expect, it } from "vitest";
import { shouldUseCachedLatestVersion } from "../src/update/autoUpdate.js";
import { isNewerVersion } from "../src/update/version.js";

describe("version comparison", () => {
  it("detects newer semantic versions", () => {
    expect(isNewerVersion("1.2.4", "1.2.3")).toBe(true);
    expect(isNewerVersion("1.3.0", "1.2.9")).toBe(true);
    expect(isNewerVersion("2.0.0", "1.9.9")).toBe(true);
    expect(isNewerVersion("1.2.3", "1.2.3")).toBe(false);
    expect(isNewerVersion("1.2.2", "1.2.3")).toBe(false);
  });

  it("does not trust a fresh cache when it says the current version is latest", () => {
    const now = Date.parse("2026-05-21T12:00:00.000Z");

    expect(
      shouldUseCachedLatestVersion(
        {
          checkedAt: "2026-05-21T11:59:00.000Z",
          latestVersion: "1.3.5"
        },
        "1.3.5",
        now
      )
    ).toBe(false);
  });

  it("trusts a fresh cache when it already reports an update", () => {
    const now = Date.parse("2026-05-21T12:00:00.000Z");

    expect(
      shouldUseCachedLatestVersion(
        {
          checkedAt: "2026-05-21T11:59:00.000Z",
          latestVersion: "1.3.6"
        },
        "1.3.5",
        now
      )
    ).toBe(true);
  });
});
