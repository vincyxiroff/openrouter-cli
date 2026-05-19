import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import type { AppConfig, ContextFile } from "../../core/types.js";
import { validateFilePath } from "../../safety/files.js";
import { isInside, toPosixPath } from "../../utils/path.js";
import { parseFileMentions } from "../parser/fileMentionParser.js";
import { loadFileMentionEntries } from "../scanner/fileMentionCache.js";
import type { FileMentionEntry } from "../scanner/fileMentionScanner.js";

export class MentionContextResolver {
  constructor(
    private readonly cwd: string,
    private readonly config: AppConfig
  ) {}

  async resolvePrompt(prompt: string): Promise<ContextFile[]> {
    const mentions = parseFileMentions(prompt);

    if (mentions.length === 0) {
      return [];
    }

    const entries = await loadFileMentionEntries(this.cwd, this.config);
    const selected = new Map<string, FileMentionEntry>();

    for (const mention of mentions) {
      const normalized = normalizeMention(mention.value);
      const exact = entries.find(
        (entry) => entry.path === normalized || entry.path === `${normalized}/`
      );

      if (exact?.type === "file") {
        selected.set(exact.path, exact);
      }

      if (exact?.type === "dir") {
        for (const entry of entries) {
          if (entry.type === "file" && entry.path.startsWith(exact.path)) {
            selected.set(entry.path, entry);
          }
        }
      }
    }

    const files: ContextFile[] = [];

    for (const entry of selected.values()) {
      if (files.length >= this.config.maxContextFiles) {
        break;
      }

      const file = await this.readContextFile(entry);

      if (file) {
        files.push(file);
      }
    }

    return files;
  }

  private async readContextFile(entry: FileMentionEntry): Promise<ContextFile | undefined> {
    if (validateFilePath(entry.path).ok !== true || !isInside(this.cwd, entry.path)) {
      return undefined;
    }

    const absolute = join(this.cwd, entry.path);
    const fileStat = await stat(absolute);

    if (fileStat.size > this.config.maxFileSizeKB * 1024) {
      return undefined;
    }

    return {
      path: entry.path,
      content: await readFile(absolute, "utf8"),
      score: 10_000,
      size: fileStat.size
    };
  }
}

function normalizeMention(value: string): string {
  return toPosixPath(value.replace(/^@/, "").replace(/^\.?\//, ""));
}
