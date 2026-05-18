import type { McpServerConfig, McpTool } from "../types/mcp.js";

export type DiscoveredMcpTool = {
  name: string;
  server: string;
  tool: McpTool;
  permissions: string[];
};

export class McpToolRegistry {
  private readonly tools = new Map<string, DiscoveredMcpTool>();

  register(server: McpServerConfig, tools: McpTool[]): void {
    for (const tool of tools) {
      this.tools.set(`${server.name}.${tool.name}`, {
        name: `${server.name}.${tool.name}`,
        server: server.name,
        tool,
        permissions: server.permissions ?? []
      });
    }
  }

  list(): DiscoveredMcpTool[] {
    return [...this.tools.values()].sort((a, b) => a.name.localeCompare(b.name));
  }
}
