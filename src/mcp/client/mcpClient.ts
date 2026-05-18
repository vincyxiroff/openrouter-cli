import { HttpMcpTransport } from "../transport/httpTransport.js";
import { StdioMcpTransport } from "../transport/stdioTransport.js";
import type { McpResponse, McpServerConfig, McpTool, McpTransport } from "../types/mcp.js";

export class McpClient {
  private nextId = 1;

  constructor(
    private readonly server: McpServerConfig,
    private readonly cwd: string,
    private readonly transport: McpTransport = createTransport(server, cwd)
  ) {}

  async connect(): Promise<void> {
    await this.transport.start();
    await this.request("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: {
        name: "openrouter-cli",
        version: "0.1.0"
      }
    });
  }

  async listTools(): Promise<McpTool[]> {
    const result = await this.request("tools/list");
    const value = result as { tools?: McpTool[] };
    return value.tools ?? [];
  }

  async close(): Promise<void> {
    await this.transport.close();
  }

  private async request(method: string, params?: unknown): Promise<unknown> {
    const response = await this.transport.request(
      {
        jsonrpc: "2.0",
        id: this.nextId++,
        method,
        params
      },
      this.server.timeoutMs ?? 10_000
    );
    return parseResponse(response);
  }
}

function createTransport(server: McpServerConfig, cwd: string): McpTransport {
  if (server.url) {
    return new HttpMcpTransport(server.url);
  }

  if (!server.command) {
    throw new Error(`MCP server has no transport: ${server.name}`);
  }

  return new StdioMcpTransport(server.command, server.args ?? [], cwd);
}

function parseResponse(response: McpResponse): unknown {
  if (response.error) {
    throw new Error(response.error.message);
  }

  return response.result;
}
