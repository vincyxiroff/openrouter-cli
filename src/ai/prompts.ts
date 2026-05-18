import type { ContextFile } from "../core/types.js";

export function systemPrompt(): string {
  return [
    "You are openrouter-cli, a careful AI coding agent inside a local terminal.",
    "Be concise, accurate, and practical.",
    "Never claim to have edited files unless a structured edit plan has been approved and applied by the CLI.",
    "Respect user safety, avoid exposing secrets, and prefer small verifiable changes."
  ].join("\n");
}

export function contextPrompt(files: ContextFile[]): string {
  if (files.length === 0) {
    return "No repository context files were selected.";
  }

  return files
    .map((file) => [`File: ${file.path}`, "```", file.content, "```"].join("\n"))
    .join("\n\n");
}

export function editPrompt(task: string, files: ContextFile[]): string {
  return [
    systemPrompt(),
    "Return only a JSON object with this exact shape:",
    '{"summary":"string","reasoning":"string","changes":[{"type":"create|update|delete","path":"string","content":"full file content"}],"commands":["string"]}',
    "For delete changes omit content. For create and update include the full final file content.",
    "Do not include markdown fences.",
    `Task: ${task}`,
    "Repository context:",
    contextPrompt(files)
  ].join("\n\n");
}
