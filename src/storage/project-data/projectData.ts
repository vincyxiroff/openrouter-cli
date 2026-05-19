import { mkdir } from "node:fs/promises";
import { getProjectDataPaths } from "../paths/projectDataPaths.js";
import type { ProjectDataPaths } from "../types/storage.js";

export async function ensureProjectData(cwd: string): Promise<ProjectDataPaths> {
  const paths = getProjectDataPaths(cwd);
  await mkdir(paths.root, { recursive: true });
  return paths;
}
