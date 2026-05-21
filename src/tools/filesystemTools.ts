import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { validateFilePath } from "../safety/files.js";
import { TrustGuard } from "../trust/guards/trustGuard.js";
import { getErrorMessage, UserFacingError } from "../utils/errors.js";
import { isInside, toPosixPath } from "../utils/path.js";
import type { ParsedToolCall } from "./toolCalls.js";

type FileToolName = "read" | "write" | "list";

type FileToolResult = {
  ok: boolean;
  message: string;
};

const readToolNames = new Set(["read", "read_file", "readfile", "open"]);
const writeToolNames = new Set(["write", "write_file", "writefile"]);
const listToolNames = new Set(["list", "list_directory", "listdir", "ls"]);

export function getFilesystemToolName(call: ParsedToolCall): FileToolName | undefined {
  const name = call.name.trim().toLowerCase();

  if (readToolNames.has(name)) {
    return "read";
  }

  if (writeToolNames.has(name)) {
    return "write";
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
    return { ok: false, message: `Write tool skipped because no content was provided for ${path}.` };
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

function trimToolOutput(output: string, maxLength = 12_000): string {
  if (output.length <= maxLength) {
    return output;
  }

  return `${output.slice(0, maxLength)}\n[output truncated after ${maxLength} characters]`;
}

export function formatFilesystemToolError(call: ParsedToolCall, error: unknown): string {
  return `Tool ${call.name} failed: ${getErrorMessage(error)}`;
}
