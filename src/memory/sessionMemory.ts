import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { ChatMessage } from "../core/types.js";
import { getProjectDataPaths } from "../storage/paths/projectDataPaths.js";

export async function readHistory(cwd: string): Promise<ChatMessage[]> {
  try {
    const raw = await readFile(getProjectDataPaths(cwd).history, "utf8");
    const parsed = JSON.parse(raw) as ChatMessage[];
    return Array.isArray(parsed) ? parsed.slice(-40) : [];
  } catch {
    return [];
  }
}

export async function appendHistory(cwd: string, messages: ChatMessage[]): Promise<void> {
  const current = await readHistory(cwd);
  const next = [...current, ...messages].slice(-80);
  const path = getProjectDataPaths(cwd).history;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(next, null, 2)}\n`, "utf8");
}
