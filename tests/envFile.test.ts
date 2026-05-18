import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { ensureGitignoreEntry, upsertEnvValue } from "../src/config/envFile.js";

describe("envFile", () => {
  it("updates only the requested env value", async () => {
    const dir = await mkdtemp(join(tmpdir(), "orc-env-"));

    try {
      await writeFile(join(dir, ".env"), "OTHER=value\nOPENROUTER_API_KEY=old\n", "utf8");
      await upsertEnvValue(dir, "OPENROUTER_API_KEY", "new-key");

      await expect(readFile(join(dir, ".env"), "utf8")).resolves.toBe(
        "OTHER=value\nOPENROUTER_API_KEY=new-key\n"
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("adds env to gitignore once", async () => {
    const dir = await mkdtemp(join(tmpdir(), "orc-gitignore-"));

    try {
      await writeFile(join(dir, ".gitignore"), "dist\n", "utf8");
      await ensureGitignoreEntry(dir, ".env");
      await ensureGitignoreEntry(dir, ".env");

      await expect(readFile(join(dir, ".gitignore"), "utf8")).resolves.toBe("dist\n.env\n");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
