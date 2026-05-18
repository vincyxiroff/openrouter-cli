# MCP Tool Discovery

When `orc mcp connect` runs, the CLI:

1. Reads `.openrouter-cli/mcp.json`.
2. Selects enabled servers.
3. Starts stdio or HTTP transport.
4. Sends `initialize`.
5. Calls `tools/list`.
6. Registers discovered tools with the MCP tool registry.
7. Prints tool names and descriptions.

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

Future tool execution must pass through an approval layer. For example:

```text
Allow MCP tool github.create_issue?
```

The approval adapter is implemented in `src/mcp/adapters/mcpToolAdapter.ts`.
