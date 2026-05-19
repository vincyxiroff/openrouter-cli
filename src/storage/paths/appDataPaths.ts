import { mkdir } from "node:fs/promises";
import { mkdirSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join } from "node:path";
import type { AppDataPaths } from "../types/storage.js";

const appName = "openrouter-cli";

export async function getAppDataDir(): Promise<string> {
  const dir = getAppDataDirSync();
  await mkdir(dir, { recursive: true });
  return dir;
}

export function getAppDataDirSync(): string {
  const root = appDataRoot();
  const dir = join(root, appName);
  mkdirSync(dir, { recursive: true });
  return dir;
}

export async function getAppDataPaths(): Promise<AppDataPaths> {
  const root = await getAppDataDir();
  const paths: AppDataPaths = {
    root,
    trusted: join(root, "trusted.json"),
    globalConfig: join(root, "global-config.json"),
    modelsCache: join(root, "models-cache.json"),
    plugins: join(root, "plugins"),
    pluginRegistryCache: join(root, "cache", "plugin-registry.json"),
    updateCheck: join(root, "cache", "update-check.json"),
    logs: join(root, "logs"),
    cache: join(root, "cache"),
    authMetadata: join(root, "auth-metadata.json"),
    apiKey: join(root, "auth.json"),
    telemetry: join(root, "telemetry.json")
  };

  await Promise.all([
    mkdir(paths.plugins, { recursive: true }),
    mkdir(paths.logs, { recursive: true }),
    mkdir(paths.cache, { recursive: true })
  ]);

  return paths;
}

function appDataRoot(): string {
  if (platform() === "win32") {
    return process.env.APPDATA ?? join(homedir(), "AppData", "Roaming");
  }

  if (platform() === "darwin") {
    return join(homedir(), "Library", "Application Support");
  }

  return process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config");
}
