import type { ContextFile } from "../core/types.js";

export function formatContextList(files: ContextFile[]): string {
  if (files.length === 0) {
    return "No files selected.";
  }

  return files
    .map((file) => `${file.path} ${Math.round(file.size / 1024)}KB score ${file.score}`)
    .join("\n");
}
