import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { getAppDataPaths } from "../../storage/paths/appDataPaths.js";
import type { TrustDatabase } from "../types/trust.js";

export class TrustStorage {
  async read(): Promise<TrustDatabase> {
    const paths = await getAppDataPaths();

    try {
      const raw = JSON.parse(await readFile(paths.trusted, "utf8")) as Partial<TrustDatabase>;
      return {
        trustedProjects: [...new Set((raw.trustedProjects ?? []).map(normalizePath))],
        trustedFolders: [...new Set((raw.trustedFolders ?? []).map(normalizePath))]
      };
    } catch {
      return { trustedProjects: [], trustedFolders: [] };
    }
  }

  async write(database: TrustDatabase): Promise<void> {
    const paths = await getAppDataPaths();
    await mkdir(dirname(paths.trusted), { recursive: true });
    await writeFile(
      paths.trusted,
      `${JSON.stringify(
        {
          trustedProjects: [...new Set(database.trustedProjects.map(normalizePath))].sort(),
          trustedFolders: [...new Set(database.trustedFolders.map(normalizePath))].sort()
        },
        null,
        2
      )}\n`,
      "utf8"
    );
  }

  async path(): Promise<string> {
    return (await getAppDataPaths()).trusted;
  }
}

export function normalizePath(path: string): string {
  return resolve(path).replaceAll("\\", "/").replace(/\/+$/, "");
}
