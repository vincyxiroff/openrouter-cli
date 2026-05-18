import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { ChatMessage } from "../core/types.js";

const historyPath = ".openrouter-cli/history.json";

export async function readHistory(cwd: string): Promise<ChatMessage[]> {
  try {
    const raw = await readFile(join(cwd, historyPath), "utf8");
    const parsed = JSON.parse(raw) as ChatMessage[];
    return Array.isArray(parsed) ? parsed.slice(-40) : [];
  } catch {
    return [];
  }
}

export async function appendHistory(cwd: string, messages: ChatMessage[]): Promise<void> {
  const current = await readHistory(cwd);
  const next = [...current, ...messages].slice(-80);
  const path = join(cwd, historyPath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(next, null, 2)}\n`, "utf8");
}
