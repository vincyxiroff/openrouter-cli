import boxen from "boxen";
import MarkdownIt from "markdown-it";
import { highlight } from "cli-highlight";
import { theme } from "./theme.js";

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true
});

export function header(): string {
  return boxen(
    `${theme.title("openrouter-cli")}\n${theme.muted("The AI coding CLI powered by OpenRouter.")}`,
    {
      padding: 1,
      borderColor: "#7c5cff",
      borderStyle: "round"
    }
  );
}

export function renderMarkdown(input: string): string {
  const text = markdown.render(input).replace(/<[^>]+>/g, "");
  return highlight(text, { language: "markdown", ignoreIllegals: true });
}

export function printInfo(message: string): void {
  console.log(theme.accent(message));
}

export function printMuted(message: string): void {
  console.log(theme.muted(message));
}

export function printError(message: string): void {
  console.error(theme.danger(message));
}
