import { mkdir, readFile, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getAppDataDirSync, getAppDataPaths } from "../paths/appDataPaths.js";

type StoredApiKey = {
  provider: "openrouter";
  apiKey: string;
  updatedAt: string;
};

export async function readGlobalApiKey(): Promise<string | undefined> {
  const paths = await getAppDataPaths();

  try {
    return parseStoredApiKey(await readFile(paths.apiKey, "utf8"));
  } catch {
    return undefined;
  }
}

export function readGlobalApiKeySync(): string | undefined {
  try {
    return parseStoredApiKey(readFileSync(join(getAppDataDirSync(), "auth.json"), "utf8"));
  } catch {
    return undefined;
  }
}

export async function writeGlobalApiKey(apiKey: string): Promise<void> {
  const paths = await getAppDataPaths();
  const payload: StoredApiKey = {
    provider: "openrouter",
    apiKey,
    updatedAt: new Date().toISOString()
  };
  await mkdir(dirname(paths.apiKey), { recursive: true });
  await writeFile(paths.apiKey, `${JSON.stringify(payload, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600
  });
}

function parseStoredApiKey(raw: string): string | undefined {
  const parsed = JSON.parse(raw) as Partial<StoredApiKey>;
  return typeof parsed.apiKey === "string" && parsed.apiKey.trim() ? parsed.apiKey : undefined;
}
