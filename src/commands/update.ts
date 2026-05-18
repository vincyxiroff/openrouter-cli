import { confirm } from "@inquirer/prompts";
import { packageName, packageVersion } from "../config/packageInfo.js";
import { printInfo, printMuted } from "../terminal/render.js";
import { fetchLatestVersion, installLatestVersion } from "../update/autoUpdate.js";
import { isNewerVersion } from "../update/version.js";

export async function updateCommand(): Promise<void> {
  const latestVersion = await fetchLatestVersion();

  if (!latestVersion) {
    printMuted("Unable to check npm registry.");
    return;
  }

  printInfo(`Current version: ${packageName()} ${packageVersion()}`);
  printInfo(`Latest npm version: ${latestVersion}`);

  if (!isNewerVersion(latestVersion, packageVersion())) {
    printMuted("Already up to date.");
    return;
  }

  const shouldUpdate = await confirm({ message: "Install update now?", default: true });

  if (!shouldUpdate) {
    printMuted("Update skipped.");
    return;
  }

  await installLatestVersion(latestVersion);
}
