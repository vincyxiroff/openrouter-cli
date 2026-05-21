import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { defaultConfig } from "../src/config/defaults.js";
import { MentionContextResolver } from "../src/mentions/context/mentionContextResolver.js";
import { matchFileMentions } from "../src/mentions/matcher/fileMentionMatcher.js";
import { parseFileMentions } from "../src/mentions/parser/fileMentionParser.js";
import { loadFileMentionEntries } from "../src/mentions/scanner/fileMentionCache.js";
import type { FileMentionEntry } from "../src/mentions/scanner/fileMentionScanner.js";

describe("file mentions", () => {
  it("parses file mentions from prompts", () => {
    expect(parseFileMentions("fix @src/auth.ts and @package.json")).toEqual([
      { token: "@src/auth.ts", value: "src/auth.ts", start: 4, end: 16 },
      { token: "@package.json", value: "package.json", start: 21, end: 34 }
    ]);
  });

  it("matches paths, filenames, and fuzzy queries", () => {
    const entries: FileMentionEntry[] = [
      { path: "src/index.ts", type: "file", size: 10 },
      { path: "src/auth.ts", type: "file", size: 10, status: "MODIFIED" },
      { path: "package.json", type: "file", size: 10 },
      { path: "README.md", type: "file", size: 10 }
    ];

    expect(matchFileMentions("idx", entries)[0]?.entry.path).toBe("src/index.ts");
    expect(matchFileMentions("auth", entries)[0]?.entry.path).toBe("src/auth.ts");
    expect(matchFileMentions("pkg", entries)[0]?.entry.path).toBe("package.json");
    expect(matchFileMentions("read", entries)[0]?.entry.path).toBe("README.md");
  });

  it("prioritizes files inside a mentioned directory", () => {
    const entries: FileMentionEntry[] = [
      { path: "src/", type: "dir", size: 0 },
      { path: "src/ai/", type: "dir", size: 0 },
      { path: "src/tools/", type: "dir", size: 0 },
      { path: "src/index.ts", type: "file", size: 10 },
      { path: "src/ai/prompts.ts", type: "file", size: 10 },
      { path: "src/tools/toolCalls.ts", type: "file", size: 10 }
    ];

    expect(
      matchFileMentions("src", entries)
        .map((match) => match.entry.path)
        .slice(0, 3)
    ).toEqual(["src/index.ts", "src/ai/prompts.ts", "src/tools/toolCalls.ts"]);
  });

  it("resolves mentioned files into context", async () => {
    const cwd = join(tmpdir(), `orc-mentions-${Date.now()}`);
    await mkdir(join(cwd, "src"), { recursive: true });
    await writeFile(join(cwd, "src", "index.ts"), "export const value = 1;\n", "utf8");
    await writeFile(join(cwd, "package.json"), "{}\n", "utf8");

    const files = await new MentionContextResolver(cwd, defaultConfig).resolvePrompt(
      "explain @src/index.ts"
    );

    expect(files).toHaveLength(1);
    expect(files[0]?.path).toBe("src/index.ts");
    expect(files[0]?.content).toContain("value");
  });

  it("refreshes file mention cache when a root file is added", async () => {
    const cwd = join(tmpdir(), `orc-mentions-cache-${Date.now()}`);
    await mkdir(cwd, { recursive: true });
    await writeFile(join(cwd, "package.json"), "{}\n", "utf8");

    try {
      expect(await loadFileMentionEntries(cwd, defaultConfig)).not.toContainEqual(
        expect.objectContaining({ path: "index.html" })
      );

      await writeFile(join(cwd, "index.html"), "<!doctype html>\n", "utf8");
      const entries = await loadFileMentionEntries(cwd, defaultConfig);

      expect(entries).toContainEqual(expect.objectContaining({ path: "index.html", type: "file" }));
      expect(matchFileMentions("index.", entries)[0]?.entry.path).toBe("index.html");
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
});
