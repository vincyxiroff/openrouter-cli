import { join } from "node:path";
import type { ProjectDataPaths } from "../types/storage.js";

export function getProjectDataDir(cwd: string): string {
  return join(cwd, ".openrouter-cli");
}

export function getProjectDataPaths(cwd: string): ProjectDataPaths {
  const root = getProjectDataDir(cwd);

  return {
    root,
    history: join(root, "history.json"),
    projectConfig: join(root, "project-config.json"),
    filesCache: join(root, "files-cache.json"),
    slashRecent: join(root, "slash-recent.json"),
    fileMentionsRecent: join(root, "file-mentions-recent.json"),
    mcp: join(root, "mcp.json"),
    plugins: join(root, "plugins.json"),
    pluginsDir: join(root, "plugins")
  };
}
