import { readFile, readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { execa } from "execa";
import ignore from "ignore";
import type { AppConfig } from "../../core/types.js";
import { validateFilePath } from "../../safety/files.js";
import { toPosixPath } from "../../utils/path.js";

export type FileMentionEntry = {
  path: string;
  type: "file" | "dir";
  size: number;
  status?: "MODIFIED" | "STAGED" | "NEW";
};

export class FileMentionScanner {
  constructor(
    private readonly cwd: string,
    private readonly config: AppConfig
  ) {}

  async scan(): Promise<FileMentionEntry[]> {
    const matcher = ignore().add(this.config.ignoredPaths);
    const gitignore = await this.readGitignore();

    if (gitignore) {
      matcher.add(gitignore);
    }

    const statuses = await this.gitStatuses();
    const entries = await this.collect(this.cwd, matcher);

    return entries
      .map((entry) => {
        const status = statuses.get(entry.path);
        return status ? { ...entry, status } : entry;
      })
      .sort((a, b) => a.path.localeCompare(b.path));
  }

  private async collect(
    dir: string,
    matcher: ReturnType<typeof ignore>
  ): Promise<FileMentionEntry[]> {
    const entries = await readdir(dir, { withFileTypes: true });
    const results: FileMentionEntry[] = [];

    for (const entry of entries) {
      const absolute = join(dir, entry.name);
      const path = toPosixPath(relative(this.cwd, absolute));

      if (!path || matcher.ignores(path) || validateFilePath(path).ok !== true) {
        continue;
      }

      if (entry.isDirectory()) {
        results.push({ path: `${path}/`, type: "dir", size: 0 });
        results.push(...(await this.collect(absolute, matcher)));
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const fileStat = await stat(absolute);

      if (fileStat.size > this.config.maxFileSizeKB * 1024 || (await this.isBinary(absolute))) {
        continue;
      }

      results.push({ path, type: "file", size: fileStat.size });
    }

    return results;
  }

  private async readGitignore(): Promise<string> {
    try {
      return await readFile(join(this.cwd, ".gitignore"), "utf8");
    } catch {
      return "";
    }
  }

  private async isBinary(path: string): Promise<boolean> {
    const sample = await readFile(path);
    return sample.subarray(0, 1024).includes(0);
  }

  private async gitStatuses(): Promise<Map<string, FileMentionEntry["status"]>> {
    try {
      const result = await execa("git", ["status", "--short"], { cwd: this.cwd, reject: false });
      const statuses = new Map<string, FileMentionEntry["status"]>();

      for (const line of result.stdout.split(/\r?\n/)) {
        if (!line.trim()) {
          continue;
        }

        const code = line.slice(0, 2);
        const file = toPosixPath(line.slice(3).trim().replace(/^"|"$/g, ""));
        const status = code.includes("?") ? "NEW" : code[0] !== " " ? "STAGED" : "MODIFIED";
        statuses.set(file, status);
      }

      return statuses;
    } catch {
      return new Map();
    }
  }
}
