import { execa } from "execa";
import { createPluginRuntime } from "../plugins/core/pluginManager.js";
import { validateCommand } from "../safety/commands.js";
import { TrustGuard } from "../trust/guards/trustGuard.js";
import { UserFacingError } from "../utils/errors.js";

export type ShellCommandResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

export async function runShellCommand(command: string, cwd: string): Promise<number> {
  await new TrustGuard().ensureTrusted(cwd, "command execution");
  const validation = validateCommand(command);

  if (!validation.ok) {
    throw new UserFacingError(validation.reason);
  }

  await (await createPluginRuntime(cwd)).hooks.onCommandExecution(command);
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
