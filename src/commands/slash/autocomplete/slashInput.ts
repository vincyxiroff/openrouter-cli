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
      output.write(`${theme.title(prompt)}${value}\n`);
      resolve(result);
    };

    const render = (): void => {
      clearRendered();
      const matches = currentMatches();
      const body = [`${theme.title(prompt)}${value}`];

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
        updateSuggestionMode();
        selectedIndex = 0;
        render();
        return;
      }

      if (chunk && !key.ctrl && !key.meta && chunk >= " ") {
        value += chunk;
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
