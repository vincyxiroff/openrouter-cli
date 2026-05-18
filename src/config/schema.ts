import { z } from "zod";

export const configSchema = z.object({
  model: z.string().min(1).default("anthropic/claude-sonnet-4"),
  temperature: z.number().min(0).max(2).default(0.2),
  maxContextFiles: z.number().int().min(1).max(500).default(40),
  maxFileSizeKB: z.number().int().min(1).max(10_000).default(100),
  allowCommandExecution: z.boolean().default(false),
  ignoredPaths: z
    .array(z.string())
    .default([
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
    ])
});
