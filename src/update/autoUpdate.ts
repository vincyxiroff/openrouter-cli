import { confirm } from "@inquirer/prompts";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execa } from "execa";
import ora from "ora";
import { packageName, packageVersion } from "../config/packageInfo.js";
import { printInfo, printMuted } from "../terminal/render.js";
import { isNewerVersion } from "./version.js";

type UpdateCheck = {
  checkedAt: string;
  latestVersion?: string;
};

const updateCacheFile = ".openrouter-cli/update-check.json";
const updateTtlMs = 6 * 60 * 60 * 1000;

export async function maybeAutoUpdate(cwd = process.cwd()): Promise<void> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return;
  }

  const cached = await readUpdateCheck(cwd);

  if (cached && Date.now() - Date.parse(cached.checkedAt) < updateTtlMs) {
    if (cached.latestVersion && isNewerVersion(cached.latestVersion, packageVersion())) {
      await promptUpdate(cached.latestVersion);
    }

    return;
  }

  const latestVersion = await fetchLatestVersion();

  if (!latestVersion) {
    return;
  }

  await writeUpdateCheck(cwd, { checkedAt: new Date().toISOString(), latestVersion });

  if (isNewerVersion(latestVersion, packageVersion())) {
    await promptUpdate(latestVersion);
  }
}

export async function fetchLatestVersion(): Promise<string | undefined> {
  const result = await execa("npm", ["view", packageName(), "version"], {
    reject: false,
    timeout: 7000
  });

  if (result.exitCode !== 0) {
    return undefined;
  }

  return result.stdout.trim() || undefined;
}

export async function installLatestVersion(latestVersion: string): Promise<boolean> {
  const spinner = ora(`Updating ${packageName()} to ${latestVersion}`).start();
  const result = await execa("npm", ["install", "-g", `${packageName()}@${latestVersion}`], {
    reject: false,
    timeout: 120_000
  });

  if (result.exitCode === 0) {
    spinner.succeed(`${packageName()} updated to ${latestVersion}`);
    return true;
  }

  spinner.fail("Update failed");
  printMuted((result.stderr || result.stdout).trim() || "npm install failed");
  return false;
}

async function promptUpdate(latestVersion: string): Promise<void> {
  printInfo(`Update available: ${packageName()} ${packageVersion()} -> ${latestVersion}`);
  const shouldUpdate = await confirm({ message: "Install update now?", default: true });

  if (!shouldUpdate) {
    printMuted("Update skipped.");
    return;
  }

  const updated = await installLatestVersion(latestVersion);

  if (updated) {
    printMuted("Restart orc to run the updated version.");
  }
}

async function readUpdateCheck(cwd: string): Promise<UpdateCheck | undefined> {
  try {
    return JSON.parse(await readFile(join(cwd, updateCacheFile), "utf8")) as UpdateCheck;
  } catch {
    return undefined;
  }
}

async function writeUpdateCheck(cwd: string, check: UpdateCheck): Promise<void> {
  await mkdir(join(cwd, ".openrouter-cli"), { recursive: true });
  await writeFile(join(cwd, updateCacheFile), `${JSON.stringify(check, null, 2)}\n`, "utf8");
}
