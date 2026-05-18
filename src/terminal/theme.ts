import chalk from "chalk";

export const theme = {
  brand: chalk.hex("#7c5cff"),
  accent: chalk.hex("#00b894"),
  muted: chalk.hex("#8a8f98"),
  danger: chalk.hex("#ff5c7a"),
  warning: chalk.hex("#f5a623"),
  success: chalk.hex("#2ecc71"),
  title(value: string): string {
    return chalk.bold.hex("#7c5cff")(value);
  }
};
