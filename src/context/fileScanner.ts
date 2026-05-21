import { readFile, readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import ignore from "ignore";
import type { AppConfig, ContextFile } from "../core/types.js";
import { toPosixPath } from "../utils/path.js";

const secretPatterns = [
  ".env",
  ".pem",
  "id_rsa",
  "id_ed25519",
  "credentials",
  "secret",
  "token",
  ".openrouter-cli"
];

const usefulExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".yml",
  ".yaml",
  ".css",
  ".scss",
  ".html",
  ".py",
  ".go",
  ".rs",
  ".java",
  ".cs",
  ".php",
  ".rb",
  ".vue",
  ".svelte"
]);

export async function buildContext(
  cwd: string,
  config: AppConfig,
  query: string
): Promise<ContextFile[]> {
  const matcher = ignore().add(config.ignoredPaths);
  const gitignore = await readGitignore(cwd);

  if (gitignore) {
    matcher.add(gitignore);
  }

  const candidates = await collectFiles(cwd, cwd, matcher, config);
  const scored = await Promise.all(
    candidates.map(async (path) => {
      const absolute = join(cwd, path);
      const content = await readFile(absolute, "utf8");
      const fileStat = await stat(absolute);
      return {
        path,
        content,
        score: scoreFile(path, content, query),
        size: fileStat.size
      };
    })
  );

  return scored
    .filter((file) => file.score > 0)
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
    .slice(0, config.maxContextFiles);
}

async function readGitignore(cwd: string): Promise<string> {
  try {
    return await readFile(join(cwd, ".gitignore"), "utf8");
  } catch {
    return "";
  }
}

async function collectFiles(
  root: string,
  dir: string,
  matcher: ReturnType<typeof ignore>,
  config: AppConfig
): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolute = join(dir, entry.name);
    const relativePath = toPosixPath(relative(root, absolute));

    if (!relativePath || matcher.ignores(relativePath) || isSensitive(relativePath)) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(root, absolute, matcher, config)));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const fileStat = await stat(absolute);

    if (fileStat.size > config.maxFileSizeKB * 1024) {
      continue;
    }

    if (!hasUsefulExtension(relativePath) || (await isBinary(absolute))) {
      continue;
    }

    files.push(relativePath);
  }

  return files;
}

function hasUsefulExtension(path: string): boolean {
  const index = path.lastIndexOf(".");
  return index > -1 && usefulExtensions.has(path.slice(index).toLowerCase());
}

function isSensitive(path: string): boolean {
  const normalized = path.toLowerCase();
  return secretPatterns.some((pattern) => normalized.includes(pattern));
}

async function isBinary(path: string): Promise<boolean> {
  const sample = await readFile(path);
  return sample.subarray(0, 1024).includes(0);
}

function scoreFile(path: string, content: string, query: string): number {
  const haystack = `${path}\n${content.slice(0, 4000)}`.toLowerCase();
  const terms = query
    .toLowerCase()
    .split(/[^a-z0-9_/-]+/i)
    .filter((term) => term.length > 2);
  const pathBoost = /(^|\/)(package|tsconfig|vite|next|nuxt|src|app|pages|routes|middleware)/i.test(
    path
  )
    ? 5
    : 0;
  const termScore = terms.reduce((score, term) => {
    const pathMatches = path.toLowerCase().includes(term) ? 8 : 0;
    const contentMatches = haystack.includes(term) ? 3 : 0;
    return score + pathMatches + contentMatches;
  }, 0);

  return pathBoost + termScore + Math.max(0, 3 - path.split("/").length);
}
