import type { SlashCommand } from "../registry/types.js";
import type { SlashCommandRegistry } from "../registry/slashCommandRegistry.js";

export type SlashCommandMatch = {
  command: SlashCommand;
  score: number;
  matchedBy: "exact" | "prefix" | "fuzzy" | "recent";
};

export function matchSlashCommands(
  query: string,
  registry: SlashCommandRegistry,
  limit = 8
): SlashCommandMatch[] {
  const normalized = query.trim().toLowerCase();
  const needle = normalized.startsWith("/") ? normalized : `/${normalized}`;
  const matches: SlashCommandMatch[] = [];

  for (const command of registry.list()) {
    const names = [command.name, ...(command.aliases ?? [])].map((value) => value.toLowerCase());
    const base = scoreNames(needle, names);

    if (!base && needle !== "/") {
      continue;
    }

    const recent = recentBoost(registry.recentScore(command));
    const matchedBy = base?.matchedBy ?? "recent";
    matches.push({
      command,
      score: (base?.score ?? 120) + recent + (command.priority ?? 0),
      matchedBy
    });
  }

  return matches
    .sort((a, b) => b.score - a.score || a.command.name.localeCompare(b.command.name))
    .slice(0, limit);
}

function scoreNames(
  needle: string,
  names: string[]
): { score: number; matchedBy: SlashCommandMatch["matchedBy"] } | undefined {
  let best: { score: number; matchedBy: SlashCommandMatch["matchedBy"] } | undefined;

  for (const name of names) {
    const score = scoreName(needle, name);

    if (score && (!best || score.score > best.score)) {
      best = score;
    }
  }

  return best;
}

function scoreName(
  needle: string,
  name: string
): { score: number; matchedBy: SlashCommandMatch["matchedBy"] } | undefined {
  if (needle === name) {
    return { score: 1_000, matchedBy: "exact" };
  }

  if (name.startsWith(needle)) {
    return { score: 850 - name.length, matchedBy: "prefix" };
  }

  const fuzzy = fuzzyScore(needle.replace("/", ""), name.replace("/", ""));

  if (fuzzy > 0) {
    return { score: 500 + fuzzy, matchedBy: "fuzzy" };
  }

  return undefined;
}

function fuzzyScore(needle: string, haystack: string): number {
  if (!needle) {
    return 1;
  }

  let score = 0;
  let cursor = 0;
  let streak = 0;

  for (const char of needle) {
    const index = haystack.indexOf(char, cursor);

    if (index === -1) {
      return 0;
    }

    streak = index === cursor ? streak + 1 : 0;
    score += 20 + streak * 8 - index;
    cursor = index + 1;
  }

  return score - (haystack.length - needle.length);
}

function recentBoost(timestamp: number): number {
  if (!timestamp) {
    return 0;
  }

  const ageHours = Math.max(0, (Date.now() - timestamp) / 3_600_000);
  return Math.max(0, 80 - ageHours);
}
