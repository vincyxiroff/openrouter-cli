import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { getAppDataPaths } from "../paths/appDataPaths.js";

export type GlobalConfig = {
  telemetry?: "opt-in" | "opt-out";
  auth?: {
    preferredStore?: "env" | "keychain";
    keychainProvider?: "windows-credential-manager" | "macos-keychain" | "linux-secret-service";
  };
};

export async function readGlobalConfig(): Promise<GlobalConfig> {
  const paths = await getAppDataPaths();

  try {
    return JSON.parse(await readFile(paths.globalConfig, "utf8")) as GlobalConfig;
  } catch {
    return {};
  }
}

export async function writeGlobalConfig(config: GlobalConfig): Promise<void> {
  const paths = await getAppDataPaths();
  await mkdir(dirname(paths.globalConfig), { recursive: true });
  await writeFile(paths.globalConfig, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}
