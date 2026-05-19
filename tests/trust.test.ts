import { mkdir, writeFile } from "node:fs/promises";
import { join, parse } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { TrustResolver } from "../src/trust/resolver/trustResolver.js";
import { normalizePath } from "../src/trust/storage/trustStorage.js";

describe("trust resolver", () => {
  it("detects project trust by project root", async () => {
    const cwd = join(tmpdir(), `orc-trust-${Date.now()}`, "app");
    await mkdir(join(cwd, "src"), { recursive: true });
    await writeFile(join(cwd, "package.json"), "{}\n", "utf8");

    const resolver = new TrustResolver();
    const state = await resolver.resolve(join(cwd, "src"), {
      trustedProjects: [normalizePath(cwd)],
      trustedFolders: []
    });

    expect(state.level).toBe("trusted-project");
    expect(state.projectRoot).toBe(normalizePath(cwd));
  });

  it("detects recursive folder trust", async () => {
    const root = join(tmpdir(), `orc-trust-folder-${Date.now()}`);
    const cwd = join(root, "site");
    await mkdir(cwd, { recursive: true });
    await writeFile(join(cwd, "package.json"), "{}\n", "utf8");

    const state = await new TrustResolver().resolve(cwd, {
      trustedProjects: [],
      trustedFolders: [normalizePath(root)]
    });

    expect(state.level).toBe("trusted-folder");
    expect(state.trustedPath).toBe(normalizePath(root));
  });

  it("uses restricted mode when no trust entry matches", async () => {
    const cwd = join(tmpdir(), `orc-restricted-${Date.now()}`);
    await mkdir(cwd, { recursive: true });

    const state = await new TrustResolver().resolve(cwd, {
      trustedProjects: [],
      trustedFolders: []
    });

    expect(state.level).toBe("restricted");
  });

  it("does not strip a trailing slash from the current filesystem root", () => {
    const root = normalizePath(parse(tmpdir()).root);
    expect(root.endsWith("/") || /^[A-Z]:\/$/i.test(root)).toBe(true);
  });
});
