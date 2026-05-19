import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { execa } from "execa";
import { createPluginRuntime } from "../plugins/core/pluginManager.js";
import { validateCommand } from "../safety/commands.js";
import { validateFilePath } from "../safety/files.js";
import { TrustGuard } from "../trust/guards/trustGuard.js";
import { UserFacingError } from "../utils/errors.js";
import { isInside } from "../utils/path.js";

export type ShellCommandResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

type PortableHeredocWrite = {
  path: string;
  content: string;
  stdout: string;
};

export async function runShellCommand(command: string, cwd: string): Promise<number> {
  await new TrustGuard().ensureTrusted(cwd, "command execution");
  const validation = validateCommand(command);

  if (!validation.ok) {
    throw new UserFacingError(validation.reason);
  }

  await (await createPluginRuntime(cwd)).hooks.onCommandExecution(command);
  const portableWrite = parsePortableHeredocWrite(command);

  if (portableWrite) {
    const result = await runPortableHeredocWrite(portableWrite, cwd);

    if (result.stdout) {
      process.stdout.write(`${result.stdout}\n`);
    }

    return result.exitCode;
  }

  const subprocess = execa(command, {
    cwd,
    shell: true,
    stdio: "inherit",
    reject: false
  });
  const result = await subprocess;
  return result.exitCode ?? 0;
}

export async function runShellCommandWithResult(
  command: string,
  cwd: string,
  timeoutMs = 120_000
): Promise<ShellCommandResult> {
  await new TrustGuard().ensureTrusted(cwd, "command execution");
  const validation = validateCommand(command);

  if (!validation.ok) {
    throw new UserFacingError(validation.reason);
  }

  await (await createPluginRuntime(cwd)).hooks.onCommandExecution(command);
  const portableWrite = parsePortableHeredocWrite(command);

  if (portableWrite) {
    return runPortableHeredocWrite(portableWrite, cwd);
  }

  const result = await execa(command, {
    cwd,
    shell: true,
    reject: false,
    timeout: timeoutMs
  });

  return {
    exitCode: result.exitCode ?? 0,
    stdout: result.stdout,
    stderr: result.stderr
  };
}

export function parsePortableHeredocWrite(command: string): PortableHeredocWrite | undefined {
  const normalized = command.replace(/\r\n/g, "\n").trimEnd();
  const match = normalized.match(/^cat\s*>\s*(?:"([^"]+)"|'([^']+)'|([^\s]+))\s*<<\s*(?:"([^"]+)"|'([^']+)'|([A-Za-z_][A-Za-z0-9_]*))\n([\s\S]*)$/);

  if (!match) {
    return undefined;
  }

  const path = match[1] ?? match[2] ?? match[3];
  const marker = match[4] ?? match[5] ?? match[6];
  const body = match[7];

  if (!path || !marker || body === undefined) {
    return undefined;
  }

  const lines = body.split("\n");
  const markerIndex = lines.findIndex((line) => line.trim() === marker);

  if (markerIndex === -1) {
    return undefined;
  }

  const trailing = lines.slice(markerIndex + 1).join("\n").trim();

  if (trailing && !/^echo\s+(?:"([^"]*)"|'([^']*)')\s*$/s.test(trailing)) {
    return undefined;
  }

  const echoMatch = trailing.match(/^echo\s+(?:"([^"]*)"|'([^']*)')\s*$/s);
  const contentLines = lines.slice(0, markerIndex);

  return {
    path,
    content: contentLines.length > 0 ? `${contentLines.join("\n")}\n` : "",
    stdout: echoMatch ? (echoMatch[1] ?? echoMatch[2] ?? "") : `Wrote ${path}`
  };
}

async function runPortableHeredocWrite(
  portableWrite: PortableHeredocWrite,
  cwd: string
): Promise<ShellCommandResult> {
  await new TrustGuard().ensureTrusted(cwd, "editing");
  const validation = validateFilePath(portableWrite.path);

  if (!validation.ok) {
    throw new UserFacingError(validation.reason);
  }

  if (!isInside(cwd, portableWrite.path)) {
    throw new UserFacingError(`Refusing to write outside project: ${portableWrite.path}`);
  }

  const absolute = join(cwd, portableWrite.path);
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, portableWrite.content, "utf8");

  return {
    exitCode: 0,
    stdout: portableWrite.stdout,
    stderr: ""
  };
}
