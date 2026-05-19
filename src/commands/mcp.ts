import { McpClient } from "../mcp/client/mcpClient.js";
import { readMcpConfig, removeMcpServer, upsertMcpServer } from "../mcp/registry/mcpConfig.js";
import { McpToolRegistry } from "../mcp/tools/mcpToolRegistry.js";
import type { McpServerConfig } from "../mcp/types/mcp.js";
import { printInfo, printMuted } from "../terminal/render.js";
import { theme } from "../terminal/theme.js";
import { TrustGuard } from "../trust/guards/trustGuard.js";

export async function mcpListCommand(cwd = process.cwd()): Promise<void> {
  const config = await readMcpConfig(cwd);

  if (config.servers.length === 0) {
    printMuted("No MCP servers configured.");
    return;
  }

  for (const server of config.servers) {
    const status = server.enabled ? theme.success("enabled") : theme.muted("disabled");
    const target = server.url ?? [server.command, ...(server.args ?? [])].filter(Boolean).join(" ");
    console.log(`${server.name} ${status} ${theme.muted(target)}`);
  }
}

export async function mcpStatusCommand(cwd = process.cwd()): Promise<void> {
  const config = await readMcpConfig(cwd);
  const enabled = config.servers.filter((server) => server.enabled);
  printInfo(`${enabled.length}/${config.servers.length} MCP servers enabled`);
}

export async function mcpConnectCommand(name?: string, cwd = process.cwd()): Promise<void> {
  await new TrustGuard().ensureTrusted(cwd, "MCP");
  const config = await readMcpConfig(cwd);
  const servers = config.servers.filter(
    (server) => server.enabled && (!name || server.name === name)
  );
  const registry = new McpToolRegistry();

  if (servers.length === 0) {
    printMuted("No matching MCP servers enabled.");
    return;
  }

  for (const server of servers) {
    const client = new McpClient(server, cwd);

    try {
      await client.connect();
      const tools = await client.listTools();
      registry.register(server, tools);
      console.log(
        `${theme.success("connected")} ${server.name} ${theme.muted(`${tools.length} tools`)}`
      );
    } catch (error) {
      console.log(
        `${theme.danger("failed")} ${server.name} ${theme.muted(error instanceof Error ? error.message : String(error))}`
      );
    } finally {
      await client.close();
    }
  }

  const tools = registry.list();

  if (tools.length > 0) {
    console.log("");
    printInfo("Discovered tools");

    for (const tool of tools) {
      console.log(`${tool.name} ${theme.muted(tool.tool.description ?? "")}`);
    }
  }
}

export function mcpDisconnectCommand(name?: string): void {
  printMuted(name ? `Disconnected MCP server: ${name}` : "Disconnected MCP servers.");
}

export async function mcpAddCommand(
  name: string,
  commandOrUrl: string,
  args: string[],
  cwd = process.cwd()
): Promise<void> {
  await new TrustGuard().ensureTrusted(cwd, "MCP");
  const server: McpServerConfig = commandOrUrl.startsWith("http")
    ? { name, url: commandOrUrl, enabled: true }
    : { name, command: commandOrUrl, args, enabled: true };
  await upsertMcpServer(cwd, server);
  printInfo(`Added MCP server: ${name}`);
}

export async function mcpRemoveCommand(name: string, cwd = process.cwd()): Promise<void> {
  await new TrustGuard().ensureTrusted(cwd, "MCP");
  await removeMcpServer(cwd, name);
  printInfo(`Removed MCP server: ${name}`);
}
