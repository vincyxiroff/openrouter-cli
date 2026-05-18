import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { z } from "zod";
import type { McpConfig, McpServerConfig } from "../types/mcp.js";

const mcpConfigPath = ".openrouter-cli/mcp.json";

const serverSchema = z
  .object({
    name: z.string().min(1),
    command: z.string().optional(),
    args: z.array(z.string()).optional(),
    url: z.string().url().optional(),
    enabled: z.boolean().default(true),
    timeoutMs: z.number().int().positive().optional(),
    permissions: z.array(z.string()).optional()
  })
  .refine((server) => Boolean(server.command || server.url), "MCP server requires command or url");

const configSchema = z.object({
  servers: z.array(serverSchema).default([])
});

export async function readMcpConfig(cwd: string): Promise<McpConfig> {
  try {
    const raw = await readFile(join(cwd, mcpConfigPath), "utf8");
    return configSchema.parse(JSON.parse(raw));
  } catch {
    return { servers: [] };
  }
}

export async function writeMcpConfig(cwd: string, config: McpConfig): Promise<void> {
  const path = join(cwd, mcpConfigPath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(
    path,
    `${JSON.stringify({ servers: uniqueServers(config.servers) }, null, 2)}\n`,
    "utf8"
  );
}

export async function upsertMcpServer(cwd: string, server: McpServerConfig): Promise<void> {
  const config = await readMcpConfig(cwd);
  const servers = config.servers.filter((entry) => entry.name !== server.name);
  await writeMcpConfig(cwd, { servers: [...servers, server] });
}

export async function removeMcpServer(cwd: string, name: string): Promise<void> {
  const config = await readMcpConfig(cwd);
  await writeMcpConfig(cwd, { servers: config.servers.filter((server) => server.name !== name) });
}

function uniqueServers(servers: McpServerConfig[]): McpServerConfig[] {
  const map = new Map<string, McpServerConfig>();

  for (const server of servers) {
    map.set(server.name, server);
  }

  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}
