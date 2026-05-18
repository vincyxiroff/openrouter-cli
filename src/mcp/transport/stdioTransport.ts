import { spawn } from "node:child_process";
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import type { McpRequest, McpResponse, McpTransport } from "../types/mcp.js";

export class StdioMcpTransport implements McpTransport {
  private process?: ChildProcessWithoutNullStreams;
  private buffer = Buffer.alloc(0);
  private readonly pending = new Map<number, (response: McpResponse) => void>();

  constructor(
    private readonly command: string,
    private readonly args: string[],
    private readonly cwd: string
  ) {}

  async start(): Promise<void> {
    this.process = spawn(this.command, this.args, {
      cwd: this.cwd,
      stdio: ["pipe", "pipe", "pipe"],
      shell: process.platform === "win32"
    });
    this.process.stdout.on("data", (chunk: Buffer) => this.read(chunk));
    await Promise.resolve();
  }

  async request(request: McpRequest, timeoutMs: number): Promise<McpResponse> {
    if (!this.process) {
      throw new Error("MCP stdio transport is not started");
    }

    const payload = Buffer.from(JSON.stringify(request), "utf8");
    this.process.stdin.write(`Content-Length: ${payload.length}\r\n\r\n`);
    this.process.stdin.write(payload);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(request.id);
        reject(new Error(`MCP request timed out: ${request.method}`));
      }, timeoutMs);
      this.pending.set(request.id, (response) => {
        clearTimeout(timeout);
        resolve(response);
      });
    });
  }

  async close(): Promise<void> {
    this.process?.kill();
    this.pending.clear();
    await Promise.resolve();
  }

  private read(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    for (;;) {
      const headerEnd = this.buffer.indexOf("\r\n\r\n");

      if (headerEnd === -1) {
        return;
      }

      const header = this.buffer.subarray(0, headerEnd).toString("utf8");
      const match = header.match(/content-length:\s*(\d+)/i);

      if (!match?.[1]) {
        this.buffer = this.buffer.subarray(headerEnd + 4);
        continue;
      }

      const length = Number(match[1]);
      const bodyStart = headerEnd + 4;
      const bodyEnd = bodyStart + length;

      if (this.buffer.length < bodyEnd) {
        return;
      }

      const body = this.buffer.subarray(bodyStart, bodyEnd).toString("utf8");
      this.buffer = this.buffer.subarray(bodyEnd);
      const response = JSON.parse(body) as McpResponse;

      if (typeof response.id === "number") {
        this.pending.get(response.id)?.(response);
        this.pending.delete(response.id);
      }
    }
  }
}
