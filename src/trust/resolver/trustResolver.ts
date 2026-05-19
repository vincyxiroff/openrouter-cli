import { access } from "node:fs/promises";
import { dirname, parse, resolve } from "node:path";
import type { TrustDatabase, TrustState } from "../types/trust.js";
import { normalizePath } from "../storage/trustStorage.js";

const rootMarkers = [".git", "package.json", "pnpm-workspace.yaml", "turbo.json", "workspace.json"];

export class TrustResolver {
  async resolve(cwd: string, database: TrustDatabase): Promise<TrustState> {
    const normalizedCwd = normalizePath(cwd);
    const projectRoot = await this.projectRoot(normalizedCwd);

    if (database.trustedProjects.some((path) => samePath(path, projectRoot))) {
      return {
        level: "trusted-project",
        cwd: normalizedCwd,
        projectRoot,
        trustedPath: projectRoot
      };
    }

    const folder = database.trustedFolders
      .map(normalizePath)
      .filter((path) => isInsideOrSame(path, normalizedCwd) || isInsideOrSame(path, projectRoot))
      .sort((a, b) => b.length - a.length)[0];

    if (folder) {
      return {
        level: "trusted-folder",
        cwd: normalizedCwd,
        projectRoot,
        trustedPath: folder
      };
    }

    return {
      level: "restricted",
      cwd: normalizedCwd,
      projectRoot
    };
  }

  async projectRoot(cwd: string): Promise<string> {
    let current = normalizePath(cwd);

    for (;;) {
      for (const marker of rootMarkers) {
        if (await exists(resolve(current, marker))) {
          return current;
        }
      }

      const parent = normalizePath(dirname(current));

      if (parent === current || current === normalizePath(parse(current).root)) {
        return normalizePath(cwd);
      }

      current = parent;
    }
  }
}

function samePath(a: string, b: string): boolean {
  return normalizePath(a).toLowerCase() === normalizePath(b).toLowerCase();
}

function isInsideOrSame(parent: string, child: string): boolean {
  const normalizedParent = normalizePath(parent).toLowerCase();
  const normalizedChild = normalizePath(child).toLowerCase();
  return normalizedChild === normalizedParent || normalizedChild.startsWith(`${normalizedParent}/`);
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
