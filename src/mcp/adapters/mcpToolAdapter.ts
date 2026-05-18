import { confirm } from "@inquirer/prompts";
import type { McpClient } from "../client/mcpClient.js";

export async function approveMcpToolUse(toolName: string): Promise<boolean> {
  return confirm({ message: `Allow MCP tool ${toolName}?`, default: false });
}

export async function withMcpApproval<TValue>(
  toolName: string,
  run: (client: McpClient) => Promise<TValue>,
  client: McpClient
): Promise<TValue | undefined> {
  if (!(await approveMcpToolUse(toolName))) {
    return undefined;
  }

  return run(client);
}
