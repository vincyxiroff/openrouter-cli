# MCP Tool Discovery

When `orc mcp connect` runs, the CLI:

1. Verifies the workspace is trusted.
2. Reads `.openrouter-cli/mcp.json`.
3. Selects enabled servers.
4. Starts stdio or HTTP transport.
5. Sends `initialize`.
6. Calls `tools/list`.
7. Registers discovered tools with the MCP tool registry.
8. Prints tool names and descriptions.

The CLI does not hardcode MCP tools.

## Example Output

```text
connected filesystem 3 tools

Discovered tools
filesystem.read_file Read a file
filesystem.write_file Write a file
filesystem.list_directory List files
```

## Security

Tool execution must pass through trust and approval layers. For example:

```text
Allow MCP tool github.create_issue?
```

The approval adapter is implemented in `src/mcp/adapters/mcpToolAdapter.ts`.
