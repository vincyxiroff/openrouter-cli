import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { execa } from "execa";
import type { AppConfig } from "../../core/types.js";
import { getProjectDataPaths } from "../../storage/paths/projectDataPaths.js";
import { FileMentionScanner, type FileMentionEntry } from "./fileMentionScanner.js";

type FileMentionCache = {
  key: string;
  entries: FileMentionEntry[];
};

export async function loadFileMentionEntries(
  cwd: string,
  config: AppConfig
): Promise<FileMentionEntry[]> {
  const key = await cacheKey(cwd, config);
  const path = getProjectDataPaths(cwd).filesCache;

  try {
    const cache = JSON.parse(await readFile(path, "utf8")) as FileMentionCache;

    if (cache.key === key && Array.isArray(cache.entries)) {
      return cache.entries;
    }
  } catch {
    return rescan(cwd, config, path, key);
  }

  return rescan(cwd, config, path, key);
}

async function rescan(
  cwd: string,
  config: AppConfig,
  path: string,
  key: string
): Promise<FileMentionEntry[]> {
  const entries = await new FileMentionScanner(cwd, config).scan();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify({ key, entries }, null, 2)}\n`, "utf8");
  return entries;
}

async function cacheKey(cwd: string, config: AppConfig): Promise<string> {
  const values = [
    config.maxFileSizeKB,
    config.maxContextFiles,
    config.ignoredPaths.join("|"),
    await directorySignature(cwd),
    await mtime(join(cwd, "package.json")),
    await mtime(join(cwd, ".gitignore")),
    await mtime(join(cwd, "src")),
    await gitStatus(cwd)
  ];

  return values.join("::");
}

async function directorySignature(path: string): Promise<string> {
  try {
    const entries = await readdir(path, { withFileTypes: true });
    const rows = await Promise.all(
      entries.map(async (entry) => {
        const child = join(path, entry.name);
        const info = await stat(child);
        const type = entry.isDirectory() ? "dir" : entry.isFile() ? "file" : "other";
        return `${entry.name}:${type}:${info.size}:${info.mtimeMs}`;
      })
    );

    return rows.sort().join("|");
  } catch {
    return "";
  }
}

async function mtime(path: string): Promise<string> {
  try {
    return String((await stat(path)).mtimeMs);
  } catch {
    return "0";
  }
}

async function gitStatus(cwd: string): Promise<string> {
  try {
    return (await execa("git", ["status", "--short"], { cwd, reject: false })).stdout;
  } catch {
    return "";
  }
}
