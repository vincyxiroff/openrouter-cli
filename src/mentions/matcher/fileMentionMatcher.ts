import { posix } from "node:path";
import type { FileMentionEntry } from "../scanner/fileMentionScanner.js";

export type FileMentionMatch = {
  entry: FileMentionEntry;
  score: number;
};

export function matchFileMentions(
  query: string,
  entries: FileMentionEntry[],
  recent: Map<string, number> = new Map(),
  limit = 10
): FileMentionMatch[] {
  const needle = query.toLowerCase().replace(/^@/, "");

  return entries
    .map((entry) => {
      const score = scoreEntry(needle, entry) + recentBoost(recent.get(entry.path) ?? 0);
      return { entry, score };
    })
    .filter((match) => match.score > 0 || !needle)
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(b.entry.type === "file") - Number(a.entry.type === "file") ||
        a.entry.path.localeCompare(b.entry.path)
    )
    .slice(0, limit);
}

function scoreEntry(query: string, entry: FileMentionEntry): number {
  const path = entry.path.toLowerCase();
  const name = posix.basename(path.replace(/\/$/, ""));
  const gitBoost = entry.status ? 90 : 0;
  const typeBoost = entry.type === "file" ? 8 : 0;

  if (!query) {
    return 120 + gitBoost + typeBoost - path.split("/").length;
  }

  if (path === query) {
    return 1_000 + gitBoost + typeBoost;
  }

  if (path.startsWith(query)) {
    return 850 + gitBoost + typeBoost + directoryFileBoost(query, entry) - path.length;
  }

  if (name.startsWith(query)) {
    return 760 + gitBoost + typeBoost - name.length;
  }

  if (name.includes(query)) {
    return 680 + gitBoost + typeBoost - name.length;
  }

  const fuzzy = fuzzyScore(query, path);

  if (fuzzy > 0) {
    return 450 + gitBoost + fuzzy;
  }

  return 0;
}

function directoryFileBoost(query: string, entry: FileMentionEntry): number {
  if (entry.type !== "file" || !query) {
    return 0;
  }

  const path = entry.path.toLowerCase();
  const directoryQuery = query.endsWith("/") ? query : `${query}/`;

  if (!path.startsWith(directoryQuery)) {
    return 0;
  }

  const rest = path.slice(directoryQuery.length);
  return rest.includes("/") ? 30 : 70;
}

function fuzzyScore(needle: string, haystack: string): number {
  let score = 0;
  let cursor = 0;
  let streak = 0;

  for (const char of needle) {
    const index = haystack.indexOf(char, cursor);

    if (index === -1) {
      return 0;
    }

    streak = index === cursor ? streak + 1 : 0;
    score += 16 + streak * 6 - Math.min(index, 20);
    cursor = index + 1;
  }

  return score;
}

function recentBoost(timestamp: number): number {
  if (!timestamp) {
    return 0;
  }

  const ageHours = Math.max(0, (Date.now() - timestamp) / 3_600_000);
  return Math.max(0, 70 - ageHours);
}
