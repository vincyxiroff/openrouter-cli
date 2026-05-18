import { execa } from "execa";
import { printInfo, printMuted } from "../terminal/render.js";

export async function updateCommand(): Promise<void> {
  const result = await execa("npm", ["view", "openrouter-cli", "version"], { reject: false });

  if (result.exitCode === 0 && result.stdout.trim()) {
    printInfo(`Latest npm version: ${result.stdout.trim()}`);
    return;
  }

  printMuted("Unable to check npm registry.");
}
