import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createPatch } from "diff";
import type { EditPlan, FileChange } from "../core/types.js";
import { highlightDiff } from "../terminal/highlight.js";

export async function renderPlanDiff(cwd: string, plan: EditPlan): Promise<string> {
  const patches = await Promise.all(plan.changes.map((change) => renderChangeDiff(cwd, change)));
  return highlightDiff(patches.join("\n"));
}

async function renderChangeDiff(cwd: string, change: FileChange): Promise<string> {
  const oldContent = change.type === "create" ? "" : await readExisting(cwd, change.path);
  const newContent = change.type === "delete" ? "" : change.content;
  return createPatch(
    change.path,
    oldContent,
    newContent,
    change.type === "create" ? "new" : "old",
    "new"
  );
}

async function readExisting(cwd: string, path: string): Promise<string> {
  try {
    return await readFile(join(cwd, path), "utf8");
  } catch {
    return "";
  }
}
