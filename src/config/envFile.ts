import { access, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export async function upsertEnvValue(cwd: string, key: string, value: string): Promise<void> {
  const path = join(cwd, ".env");
  const nextLine = `${key}=${formatEnvValue(value)}`;
  const current = await readOptional(path);
  const lines = current ? current.split(/\r?\n/) : [];
  const index = lines.findIndex((line) => line.match(new RegExp(`^\\s*${key}\\s*=`)));

  if (index >= 0) {
    lines[index] = nextLine;
  } else {
    if (lines.length > 0 && lines.at(-1) !== "") {
      lines.push("");
    }

    lines.push(nextLine);
  }

  await writeFile(path, `${trimTrailingEmptyLines(lines).join("\n")}\n`, "utf8");
  process.env[key] = value;
}

export async function ensureGitignoreEntry(cwd: string, entry: string): Promise<void> {
  const path = join(cwd, ".gitignore");
  const current = await readOptional(path);

  if (!current) {
    await writeFile(path, `${entry}\n`, "utf8");
    return;
  }

  const lines = current.split(/\r?\n/);

  if (lines.some((line) => line.trim() === entry)) {
    return;
  }

  await writeFile(path, `${trimTrailingEmptyLines(lines).join("\n")}\n${entry}\n`, "utf8");
}

export async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function readOptional(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return undefined;
  }
}

function formatEnvValue(value: string): string {
  if (/^[A-Za-z0-9_./:=+-]+$/.test(value)) {
    return value;
  }

  return JSON.stringify(value);
}

function trimTrailingEmptyLines(lines: string[]): string[] {
  const next = [...lines];

  while (next.length > 0 && next.at(-1) === "") {
    next.pop();
  }

  return next;
}
