import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { getProjectDataPaths } from "../../storage/paths/projectDataPaths.js";
import { parseFileMentions } from "../parser/fileMentionParser.js";

export async function readRecentFileMentions(cwd: string): Promise<Map<string, number>> {
  try {
    const raw = JSON.parse(
      await readFile(getProjectDataPaths(cwd).fileMentionsRecent, "utf8")
    ) as Record<string, number>;
    return new Map(
      Object.entries(raw).filter((entry): entry is [string, number] => typeof entry[1] === "number")
    );
  } catch {
    return new Map();
  }
}

export async function recordPromptFileMentions(cwd: string, prompt: string): Promise<void> {
  const mentions = parseFileMentions(prompt);

  if (mentions.length === 0) {
    return;
  }

  const recent = await readRecentFileMentions(cwd);

  for (const mention of mentions) {
    recent.set(mention.value, Date.now());
  }

  const path = getProjectDataPaths(cwd).fileMentionsRecent;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(
    path,
    `${JSON.stringify(Object.fromEntries([...recent.entries()].sort((a, b) => b[1] - a[1])), null, 2)}\n`,
    "utf8"
  );
}
