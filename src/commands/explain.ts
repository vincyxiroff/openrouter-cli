import { askCommand } from "./ask.js";

export async function explainCommand(cwd = process.cwd()): Promise<void> {
  await askCommand(
    "Explain this codebase architecture, key files, runtime flow, and likely development workflow.",
    cwd
  );
}
