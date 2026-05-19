import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { getAppDataPaths } from "../paths/appDataPaths.js";

export type AuthMetadata = {
  apiKeyStorage: "project-env" | "global-app-data" | "keychain";
  keychainProvider?: "windows-credential-manager" | "macos-keychain" | "linux-secret-service";
  updatedAt: string;
};

export async function readAuthMetadata(): Promise<AuthMetadata | undefined> {
  const paths = await getAppDataPaths();

  try {
    return JSON.parse(await readFile(paths.authMetadata, "utf8")) as AuthMetadata;
  } catch {
    return undefined;
  }
}

export async function writeAuthMetadata(metadata: AuthMetadata): Promise<void> {
  const paths = await getAppDataPaths();
  await mkdir(dirname(paths.authMetadata), { recursive: true });
  await writeFile(paths.authMetadata, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
}
