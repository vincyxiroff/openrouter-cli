import chalk from "chalk";

export function highlightDiff(diff: string): string {
  return diff
    .split("\n")
    .map((line) => {
      if (line.startsWith("+") && !line.startsWith("+++")) {
        return chalk.green(line);
      }

      if (line.startsWith("-") && !line.startsWith("---")) {
        return chalk.red(line);
      }

      if (line.startsWith("@@")) {
        return chalk.cyan(line);
      }

      if (line.startsWith("Index:") || line.startsWith("diff")) {
        return chalk.bold(line);
      }

      return line;
    })
    .join("\n");
}
