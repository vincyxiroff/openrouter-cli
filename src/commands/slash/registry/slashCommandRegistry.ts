import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { getProjectDataPaths } from "../../../storage/paths/projectDataPaths.js";
import type { SlashCommand } from "./types.js";

export class SlashCommandRegistry {
  private readonly commands = new Map<string, SlashCommand>();
  private readonly recency = new Map<string, number>();

  register(command: SlashCommand): void {
    this.commands.set(command.name, command);
  }

  registerMany(commands: SlashCommand[]): void {
    for (const command of commands) {
      this.register(command);
    }
  }

  list(): SlashCommand[] {
    return [...this.commands.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  get(input: string): SlashCommand | undefined {
    const normalized = normalizeSlashName(input);

    return this.list().find(
      (command) => command.name === normalized || command.aliases?.includes(normalized)
    );
  }

  recentScore(command: SlashCommand): number {
    return this.recency.get(command.name) ?? 0;
  }

  async loadRecent(cwd: string): Promise<void> {
    try {
      const raw = await readFile(getProjectDataPaths(cwd).slashRecent, "utf8");
      const parsed = JSON.parse(raw) as Record<string, number>;

      for (const [name, value] of Object.entries(parsed)) {
        if (typeof value === "number" && Number.isFinite(value)) {
          this.recency.set(name, value);
        }
      }
    } catch {
      return;
    }
  }

  async recordUsage(cwd: string, command: SlashCommand): Promise<void> {
    this.recency.set(command.name, Date.now());
    const values = Object.fromEntries([...this.recency.entries()].sort((a, b) => b[1] - a[1]));
    const path = getProjectDataPaths(cwd).slashRecent;
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `${JSON.stringify(values, null, 2)}\n`, "utf8");
  }
}

export function normalizeSlashName(input: string): `/${string}` {
  const trimmed = input.trim();
  return (trimmed.startsWith("/") ? trimmed : `/${trimmed}`) as `/${string}`;
}
