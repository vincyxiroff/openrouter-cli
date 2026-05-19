import boxen from "boxen";
import type { Options as BoxenOptions } from "boxen";
import { theme } from "../../../terminal/theme.js";
import type { SlashCommandMatch } from "../matcher/fuzzy.js";

export function renderSlashSuggestions(
  matches: SlashCommandMatch[],
  selectedIndex: number,
  width = process.stdout.columns ?? 80
): string {
  if (matches.length === 0) {
    return boxen(theme.muted("No matching commands"), boxOptions(width));
  }

  const grouped = new Map<string, SlashCommandMatch[]>();

  for (const match of matches) {
    grouped.set(match.command.category, [...(grouped.get(match.command.category) ?? []), match]);
  }

  let index = 0;
  const lines: string[] = [];

  for (const [category, categoryMatches] of grouped) {
    if (lines.length > 0) {
      lines.push("");
    }

    lines.push(theme.accent(category));

    for (const match of categoryMatches) {
      const selected = index === selectedIndex;
      const marker = selected ? theme.title(">") : " ";
      const aliases = match.command.aliases?.length
        ? theme.muted(` aliases ${match.command.aliases.join(", ")}`)
        : "";
      const name = selected ? theme.title(match.command.name) : match.command.name;
      lines.push(`${marker} ${name}${aliases}`);
      lines.push(`  ${theme.muted(match.command.description)}`);
      index += 1;
    }
  }

  return boxen(lines.join("\n"), boxOptions(width));
}

function boxOptions(width: number): BoxenOptions {
  return {
    title: "Suggestions",
    titleAlignment: "left",
    padding: { top: 0, bottom: 0, left: 1, right: 1 },
    margin: { top: 0, bottom: 0 },
    borderStyle: "round",
    borderColor: "#7c5cff",
    width: Math.max(36, Math.min(width - 2, 76))
  };
}
