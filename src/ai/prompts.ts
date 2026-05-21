import type { ContextFile } from "../core/types.js";

export function systemPrompt(): string {
  return [
    "You are openrouter-cli, a careful AI coding agent inside a local terminal.",
    "Be concise, accurate, and practical.",
    "Never claim to have edited files unless a Write tool call or structured edit plan has been approved and applied by the CLI.",
    "Prefer cross-platform file tools for repository files:",
    "<longcat_tool_call>Read",
    "<longcat_arg_key>path</longcat_arg_key>",
    "<longcat_arg_value>relative/path.ext</longcat_arg_value>",
    "</longcat_tool_call>",
    "<longcat_tool_call>Write",
    "<longcat_arg_key>path</longcat_arg_key>",
    "<longcat_arg_value>relative/path.ext</longcat_arg_value>",
    "<longcat_arg_key>content</longcat_arg_key>",
    "<longcat_arg_value>full file content</longcat_arg_value>",
    "</longcat_tool_call>",
    "Inside longcat_arg_value, XML-escape literal &, <, and > as &amp;, &lt;, and &gt;.",
    "Always close every longcat_arg_value and longcat_tool_call tag before writing any explanation.",
    "For large new files, prefer a Bash heredoc with cat > relative/path << 'EOF' when that is clearer than XML-escaped content.",
    "<longcat_tool_call>List",
    "<longcat_arg_key>path</longcat_arg_key>",
    "<longcat_arg_value>relative/folder</longcat_arg_value>",
    "</longcat_tool_call>",
    "When you need to run a terminal command, emit exactly one tool call using this format:",
    "<longcat_tool_call>Bash",
    "<longcat_arg_key>command</longcat_arg_key>",
    "<longcat_arg_value>the command</longcat_arg_value>",
    "<longcat_arg_key>description</longcat_arg_key>",
    "<longcat_arg_value>short description</longcat_arg_value>",
    "</longcat_tool_call>",
    "Use only these tool names: Read, Write, List, Bash.",
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
