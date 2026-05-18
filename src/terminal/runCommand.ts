import { execa } from "execa";
import { validateCommand } from "../safety/commands.js";
import { UserFacingError } from "../utils/errors.js";

export async function runShellCommand(command: string, cwd: string): Promise<number> {
  const validation = validateCommand(command);

  if (!validation.ok) {
    throw new UserFacingError(validation.reason);
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
