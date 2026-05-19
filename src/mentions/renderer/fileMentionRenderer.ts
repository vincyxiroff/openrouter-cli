import boxen from "boxen";
import type { Options as BoxenOptions } from "boxen";
import { theme } from "../../terminal/theme.js";
import type { FileMentionMatch } from "../matcher/fileMentionMatcher.js";

export function renderFileMentionSuggestions(
  matches: FileMentionMatch[],
  selectedIndex: number,
  width = process.stdout.columns ?? 80
): string {
  if (matches.length === 0) {
    return boxen(theme.muted("No matching files"), boxOptions(width));
  }

  const maxPath = Math.max(...matches.map((match) => displayPath(match.entry.path, width).length));
  const lines = matches.map((match, index) => {
    const selected = index === selectedIndex;
    const marker = selected ? theme.title(">") : " ";
    const path = displayPath(match.entry.path, width).padEnd(Math.min(maxPath, 46));
    const badge = match.entry.status ?? (match.entry.type === "dir" ? "DIR" : "FILE");
    const name = selected ? theme.title(path) : path;
    return `${marker} ${name} ${theme.muted(badge)}`;
  });

  return boxen(lines.join("\n"), boxOptions(width));
}

function displayPath(path: string, width: number): string {
  const max = Math.max(24, Math.min(52, width - 24));

  if (path.length <= max) {
    return path;
  }

  return `...${path.slice(-(max - 3))}`;
}

function boxOptions(width: number): BoxenOptions {
  return {
    title: "File Suggestions",
    titleAlignment: "left",
    padding: { top: 0, bottom: 0, left: 1, right: 1 },
    borderStyle: "round",
    borderColor: "#00b894",
    width: Math.max(36, Math.min(width - 2, 78))
  };
}
