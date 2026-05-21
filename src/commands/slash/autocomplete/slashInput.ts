import readline from "node:readline";
import { matchFileMentions } from "../../../mentions/matcher/fileMentionMatcher.js";
import { currentMentionToken } from "../../../mentions/parser/fileMentionParser.js";
import { renderFileMentionSuggestions } from "../../../mentions/renderer/fileMentionRenderer.js";
import type { FileMentionEntry } from "../../../mentions/scanner/fileMentionScanner.js";
import type { FileMentionMatch } from "../../../mentions/matcher/fileMentionMatcher.js";
import { matchSlashCommands } from "../matcher/fuzzy.js";
import type { SlashCommandMatch } from "../matcher/fuzzy.js";
import type { SlashCommandRegistry } from "../registry/slashCommandRegistry.js";
import { renderSlashSuggestions } from "../renderer/suggestions.js";
import { theme } from "../../../terminal/theme.js";

const ansiPattern = new RegExp(String.raw`\x1B\[[0-?]*[ -/]*[@-~]`, "g");
const compactInputLength = 180;
const outputPreviewLines = 12;

export type SlashInputResult =
  | { type: "submit"; value: string }
  | { type: "cancel" }
  | { type: "interrupt" };

export type SmartInputOptions = {
  registry: SlashCommandRegistry;
  files: FileMentionEntry[];
  recentFiles?: Map<string, number>;
  prompt?: string;
};

type SuggestionMode = "slash" | "file" | undefined;
type InputViewMode = "compact" | "full" | "output";

export async function readSlashInput(options: SmartInputOptions): Promise<SlashInputResult> {
  const registry = options.registry;
  const prompt = options.prompt ?? "> ";
  const input = process.stdin;
  const output = process.stdout;

  if (!input.isTTY || !output.isTTY) {
    return { type: "cancel" };
  }

  const wasRaw = input.isRaw;
  let value = "";
  let selectedIndex = 0;
  let suggestionsOpen = false;
  let suggestionMode: SuggestionMode;
  let renderedLines = 0;
  let sawPaste = false;
  let viewMode: InputViewMode = "compact";

  readline.emitKeypressEvents(input);

  if (input.isTTY) {
    input.setRawMode(true);
  }

  input.resume();

  return new Promise((resolve) => {
    const cleanup = (result: SlashInputResult): void => {
      input.off("keypress", onKeypress);

      if (input.isTTY) {
        input.setRawMode(Boolean(wasRaw));
      }

      clearRendered();
      output.write(`${theme.title(prompt)}${formatInputPreview(value, viewMode).text}\n`);
      resolve(result);
    };

    const render = (): void => {
      clearRendered();
      const matches = currentMatches();
      const preview = formatInputPreview(value, viewMode);
      const body = [
        `${theme.title(prompt)}${preview.text}`,
        renderInputKeybinds(preview.compacted)
      ];

      if (suggestionsOpen && suggestionMode === "slash") {
        body.push(renderSlashSuggestions(matches.slash, selectedIndex));
      }

      if (suggestionsOpen && suggestionMode === "file") {
        body.push(renderFileMentionSuggestions(matches.files, selectedIndex));
      }

      const screen = body.join("\n");
      output.write(screen);
      renderedLines = visualLineCount(screen);
    };

    const clearRendered = (): void => {
      if (renderedLines === 0) {
        return;
      }

      if (renderedLines > 1) {
        readline.moveCursor(output, 0, -(renderedLines - 1));
      }

      readline.cursorTo(output, 0);
      readline.clearScreenDown(output);
      renderedLines = 0;
    };

    const updateSuggestionMode = (): void => {
      const tokenStart = lastTokenStart(value);
      const token = value.slice(tokenStart);

      if (token.startsWith("/")) {
        suggestionMode = "slash";
        suggestionsOpen = true;
        return;
      }

      if (token.startsWith("@")) {
        suggestionMode = "file";
        suggestionsOpen = true;
        return;
      }

      suggestionMode = undefined;
      suggestionsOpen = false;
    };

    const currentMatches = (): { slash: SlashCommandMatch[]; files: FileMentionMatch[] } => {
      if (suggestionMode === "slash") {
        return {
          slash: matchSlashCommands(value.slice(lastTokenStart(value)), registry),
          files: []
        };
      }

      if (suggestionMode === "file") {
        const mention = currentMentionToken(value);
        return {
          slash: [],
          files: matchFileMentions(mention?.query ?? "", options.files, options.recentFiles)
        };
      }

      return { slash: [], files: [] };
    };

    const acceptSuggestion = (): void => {
      const matches = currentMatches();

      if (suggestionMode === "slash") {
        const match = matches.slash[selectedIndex];

        if (!match) {
          return;
        }

        value = match.command.name;
        selectedIndex = 0;
        suggestionsOpen = false;
        return;
      }

      if (suggestionMode === "file") {
        const match = matches.files[selectedIndex];
        const mention = currentMentionToken(value);

        if (!match || !mention) {
          return;
        }

        value = `${value.slice(0, mention.start)}@${match.entry.path}`;
        selectedIndex = 0;
        suggestionsOpen = false;
        suggestionMode = undefined;
      }
    };

    const onKeypress = (chunk: string, key: readline.Key): void => {
      if (key.ctrl && key.name === "c") {
        cleanup({ type: "interrupt" });
        return;
      }

      if (key.ctrl && key.name === "p") {
        viewMode = viewMode === "full" ? "compact" : "full";
        render();
        return;
      }

      if (key.ctrl && key.name === "o") {
        viewMode = viewMode === "output" ? "compact" : "output";
        render();
        return;
      }

      if (key.name === "return") {
        if (
          suggestionsOpen &&
          suggestionMode === "slash" &&
          currentMatches().slash[selectedIndex]
        ) {
          acceptSuggestion();
          cleanup({ type: "submit", value: value.trim() });
          return;
        }

        if (suggestionsOpen && suggestionMode === "file" && currentMatches().files[selectedIndex]) {
          acceptSuggestion();
          render();
          return;
        }

        cleanup({ type: "submit", value: value.trim() });
        return;
      }

      if (key.name === "escape") {
        suggestionsOpen = false;
        render();
        return;
      }

      if (key.name === "tab") {
        acceptSuggestion();
        render();
        return;
      }

      if (key.name === "up" || key.name === "down") {
        const matches =
          suggestionMode === "slash" ? currentMatches().slash : currentMatches().files;

        if (matches.length > 0) {
          suggestionsOpen = true;
          selectedIndex =
            key.name === "up"
              ? (selectedIndex - 1 + matches.length) % matches.length
              : (selectedIndex + 1) % matches.length;
          render();
        }

        return;
      }

      if (key.name === "backspace") {
        value = value.slice(0, -1);
        sawPaste = sawPaste && shouldCompactInput(value);
        updateSuggestionMode();
        selectedIndex = 0;
        render();
        return;
      }

      if (chunk && !key.ctrl && !key.meta && chunk >= " ") {
        sawPaste = sawPaste || chunk.length > 1 || chunk.includes("\n") || chunk.includes("\r");
        value += chunk;
        if (sawPaste && shouldCompactInput(value) && viewMode === "full") {
          viewMode = "compact";
        }
        updateSuggestionMode();
        selectedIndex = 0;
        render();
      }
    };

    input.on("keypress", onKeypress);
    render();
  });
}

function lastTokenStart(value: string): number {
  return Math.max(value.lastIndexOf(" "), value.lastIndexOf("\n"), value.lastIndexOf("\t")) + 1;
}

function visualLineCount(value: string): number {
  const width = Math.max(20, process.stdout.columns ?? 80);
  return value.split("\n").reduce((count, line) => {
    const plain = line.replace(ansiPattern, "");
    return count + Math.max(1, Math.ceil(plain.length / width));
  }, 0);
}

export function formatInputPreview(
  value: string,
  mode: InputViewMode = "compact",
  width = process.stdout.columns ?? 80
): { text: string; compacted: boolean } {
  if (!shouldCompactInput(value) || mode === "full") {
    return { text: value, compacted: false };
  }

  if (mode === "output") {
    return {
      text: compactCommandOutput(value, width),
      compacted: true
    };
  }

  return {
    text: compactPaste(value, width),
    compacted: true
  };
}

function shouldCompactInput(value: string): boolean {
  return value.length > compactInputLength || /\r|\n/.test(value);
}

function compactPaste(value: string, width: number): string {
  const normalized = value.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const firstLine = lines.find((line) => line.trim()) ?? lines[0] ?? "";
  const singleLine = normalized.replace(/\s+/g, " ").trim();
  const summary = `${lines.length} lines, ${value.length} chars`;
  const preview = firstLine.trim() || singleLine;
  return `${truncateForPreview(preview, width)} ${theme.muted(`[pasted: ${summary}]`)}`;
}

function compactCommandOutput(value: string, width: number): string {
  const lines = value.replace(/\r\n/g, "\n").split("\n");
  const tail = lines.slice(-outputPreviewLines).join("\n").trimEnd();
  const hidden = Math.max(0, lines.length - outputPreviewLines);

  if (!tail) {
    return compactPaste(value, width);
  }

  const label =
    hidden > 0
      ? theme.muted(`[command output: showing last ${outputPreviewLines} of ${lines.length} lines]`)
      : theme.muted("[command output]");
  return `${label}\n${truncateMultilineForPreview(tail, width)}`;
}

function truncateForPreview(value: string, width: number): string {
  const max = Math.max(24, Math.min(96, width - 28));

  if (value.length <= max) {
    return value;
  }

  return `${value.slice(0, max - 1)}…`;
}

function truncateMultilineForPreview(value: string, width: number): string {
  return value
    .split("\n")
    .map((line) => truncateForPreview(line, width))
    .join("\n");
}

function renderInputKeybinds(compacted: boolean): string {
  const pasteHint = compacted ? "Ctrl+P full paste" : "Ctrl+P compact paste";
  return theme.muted(
    `  Enter send · Tab accept · Esc close · ${pasteHint} · Ctrl+O command output`
  );
}
