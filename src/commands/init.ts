import { setupCommand } from "./setup.js";

export async function initCommand(cwd = process.cwd()): Promise<void> {
  await setupCommand({}, cwd);
}
