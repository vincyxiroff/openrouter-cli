import type { McpRequest, McpResponse, McpTransport } from "../types/mcp.js";

export class HttpMcpTransport implements McpTransport {
  constructor(private readonly url: string) {}

  async start(): Promise<void> {}

  async request(request: McpRequest, timeoutMs: number): Promise<McpResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(this.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`MCP HTTP request failed with ${response.status}`);
      }

      return (await response.json()) as McpResponse;
    } finally {
      clearTimeout(timeout);
    }
  }

  async close(): Promise<void> {}
}
