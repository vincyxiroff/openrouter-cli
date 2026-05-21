import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { validateFilePath } from "../safety/files.js";
import { TrustGuard } from "../trust/guards/trustGuard.js";
import { getErrorMessage, UserFacingError } from "../utils/errors.js";
import { isInside, toPosixPath } from "../utils/path.js";
import type { ParsedToolCall } from "./toolCalls.js";

export type FileToolName = "read" | "write" | "edit" | "delete" | "list";

type FileToolResult = {
  ok: boolean;
  message: string;
};

const readToolNames = new Set(["read", "read_file", "readfile", "open"]);
const writeToolNames = new Set(["write", "write_file", "writefile"]);
const editToolNames = new Set(["edit", "replace", "replace_in_file"]);
const deleteToolNames = new Set(["delete", "delete_file", "remove", "rm"]);
const listToolNames = new Set(["list", "list_directory", "listdir", "ls"]);

export function getFilesystemToolName(call: ParsedToolCall): FileToolName | undefined {
  const name = call.name.trim().toLowerCase();

  if (readToolNames.has(name)) {
    return "read";
  }

  if (writeToolNames.has(name)) {
    return "write";
  }

  if (editToolNames.has(name)) {
    return "edit";
  }

  if (deleteToolNames.has(name)) {
    return "delete";
  }

  if (listToolNames.has(name)) {
    return "list";
  }

  return undefined;
}

export async function executeFilesystemToolCall(
  call: ParsedToolCall,
  cwd: string
): Promise<FileToolResult> {
  const tool = getFilesystemToolName(call);

  if (tool === "read") {
    return readProjectFile(cwd, getPathInput(call));
  }

  if (tool === "write") {
    return writeProjectFile(cwd, getPathInput(call), call.input.content);
  }

  if (tool === "edit") {
    return editProjectFile(cwd, getPathInput(call), getOldInput(call), getNewInput(call));
  }

  if (tool === "delete") {
    return deleteProjectFile(cwd, getPathInput(call));
  }

  if (tool === "list") {
    return listProjectDirectory(cwd, getPathInput(call) ?? ".");
  }

  return {
    ok: false,
    message: `Unsupported filesystem tool: ${call.name}`
  };
}

async function readProjectFile(cwd: string, path: string | undefined): Promise<FileToolResult> {
  if (!path) {
    return { ok: false, message: "Read tool skipped because no path was provided." };
  }

  const safePath = validateProjectPath(cwd, path, "read");
  const content = await readFile(safePath.absolute, "utf8");

  return {
    ok: true,
    message: [
      `Read: ${safePath.display}`,
      `Size: ${content.length} characters`,
      "Content:",
      trimToolOutput(content)
    ].join("\n")
  };
}

async function writeProjectFile(
  cwd: string,
  path: string | undefined,
  content: string | undefined
): Promise<FileToolResult> {
  if (!path) {
    return { ok: false, message: "Write tool skipped because no path was provided." };
  }

  if (content === undefined) {
    return {
      ok: false,
      message: `Write tool skipped because no content was provided for ${path}.`
    };
  }

  await new TrustGuard().ensureTrusted(cwd, "editing");
  const safePath = validateProjectPath(cwd, path, "write");
  await mkdir(dirname(safePath.absolute), { recursive: true });
  await writeFile(safePath.absolute, content, "utf8");

  return {
    ok: true,
    message: `Wrote: ${safePath.display}\nSize: ${content.length} characters`
  };
}

async function editProjectFile(
  cwd: string,
  path: string | undefined,
  oldText: string | undefined,
  newText: string | undefined
): Promise<FileToolResult> {
  if (!path) {
    return { ok: false, message: "Edit tool skipped because no path was provided." };
  }

  if (oldText === undefined) {
    return {
      ok: false,
      message: `Edit tool skipped because no old text was provided for ${path}.`
    };
  }

  if (newText === undefined) {
    return {
      ok: false,
      message: `Edit tool skipped because no new text was provided for ${path}.`
    };
  }

  await new TrustGuard().ensureTrusted(cwd, "editing");
  const safePath = validateProjectPath(cwd, path, "write");
  const content = await readFile(safePath.absolute, "utf8");
  const matches = countOccurrences(content, oldText);

  if (matches === 0) {
    return {
      ok: false,
      message: `Edit skipped because old text was not found in ${safePath.display}.`
    };
  }

  if (matches > 1) {
    return {
      ok: false,
      message: `Edit skipped because old text matched ${matches} times in ${safePath.display}.`
    };
  }

  const updated = content.replace(oldText, newText);
  await writeFile(safePath.absolute, updated, "utf8");

  return {
    ok: true,
    message: `Edited: ${safePath.display}\nReplaced: ${oldText.length} characters with ${newText.length} characters`
  };
}

async function deleteProjectFile(cwd: string, path: string | undefined): Promise<FileToolResult> {
  if (!path) {
    return { ok: false, message: "Delete tool skipped because no path was provided." };
  }

  await new TrustGuard().ensureTrusted(cwd, "editing");
  const safePath = validateProjectPath(cwd, path, "write");
  const info = await stat(safePath.absolute);

  if (info.isDirectory()) {
    return { ok: false, message: `Delete skipped because ${safePath.display} is a directory.` };
  }

  await rm(safePath.absolute, { force: true });

  return {
    ok: true,
    message: `Deleted: ${safePath.display}`
  };
}

async function listProjectDirectory(cwd: string, path: string): Promise<FileToolResult> {
  const safePath = validateProjectPath(cwd, path, "read");
  const entries = await readdir(safePath.absolute, { withFileTypes: true });
  const rows = await Promise.all(
    entries.map(async (entry) => {
      const childPath = join(safePath.absolute, entry.name);
      const info = await stat(childPath);
      const suffix = entry.isDirectory() ? "/" : "";

      return `${entry.name}${suffix}\t${entry.isDirectory() ? "dir" : `${info.size} bytes`}`;
    })
  );

  return {
    ok: true,
    message: [`List: ${safePath.display}`, ...rows.sort()].join("\n")
  };
}

function validateProjectPath(
  cwd: string,
  path: string,
  action: "read" | "write"
): { absolute: string; display: string } {
  const validation = validateFilePath(path);

  if (!validation.ok) {
    throw new UserFacingError(validation.reason);
  }

  if (!isInside(cwd, path)) {
    throw new UserFacingError(`Refusing to ${action} outside project: ${path}`);
  }

  return {
    absolute: resolve(cwd, path),
    display: toPosixPath(path)
  };
}

function getPathInput(call: ParsedToolCall): string | undefined {
  return call.input.path ?? call.input.file ?? call.input.file_path;
}

function getOldInput(call: ParsedToolCall): string | undefined {
  return call.input.old ?? call.input.old_text ?? call.input.search;
}

function getNewInput(call: ParsedToolCall): string | undefined {
  return call.input.new ?? call.input.new_text ?? call.input.replace;
}

function countOccurrences(content: string, search: string): number {
  if (search.length === 0) {
    return 0;
  }

  let count = 0;
  let position = 0;

  for (;;) {
    const index = content.indexOf(search, position);

    if (index === -1) {
      return count;
    }

    count += 1;
    position = index + search.length;
  }
}

function trimToolOutput(output: string, maxLength = 12_000): string {
  if (output.length <= maxLength) {
    return output;
  }

  return `${output.slice(0, maxLength)}\n[output truncated after ${maxLength} characters]`;
}

export function formatFilesystemToolError(call: ParsedToolCall, error: unknown): string {
  return `Tool ${call.name} failed: ${getErrorMessage(error)}`;
}
