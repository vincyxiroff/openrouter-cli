import { execa } from "execa";

export async function isGitAvailable(): Promise<boolean> {
  try {
    await execa("git", ["--version"]);
    return true;
  } catch {
    return false;
  }
}

export async function gitStatus(cwd: string): Promise<string> {
  if (!(await isGitAvailable())) {
    return "";
  }

  const result = await execa("git", ["status", "--short"], { cwd, reject: false });
  return result.stdout;
}

export async function gitDiff(cwd: string): Promise<string> {
  if (!(await isGitAvailable())) {
    return "";
  }

  const result = await execa("git", ["diff", "--", "."], { cwd, reject: false });
  return result.stdout;
}
