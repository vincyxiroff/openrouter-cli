import type { AppConfig } from "../core/types.js";

export const defaultConfig: AppConfig = {
  provider: "openrouter",
  model: "anthropic/claude-sonnet-4",
  temperature: 0.2,
  maxContextFiles: 40,
  maxFileSizeKB: 100,
  allowCommandExecution: false,
  ignoredPaths: [
    "node_modules",
    ".git",
    "dist",
    "build",
    ".next",
    "coverage",
    ".turbo",
    ".cache",
    ".env",
    "*.lock"
  ]
};
