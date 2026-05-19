# MCP Support

MCP support prepares `openrouter-cli` to connect to external Model Context Protocol servers.

The MVP includes:

- MCP config file
- stdio transport
- HTTP transport
- JSON-RPC client
- dynamic tool discovery
- command surface for adding, listing, connecting, and removing servers
- approval adapter for future tool execution
- trust guard integration

## Commands

```bash
orc mcp list
orc mcp add filesystem npx @modelcontextprotocol/server-filesystem ./
orc mcp connect filesystem
orc mcp status
orc mcp remove filesystem
```

MCP connect, add, and remove operations require a trusted project or trusted folder.

## Tool Names

Discovered tools are named as:

```text
<server>.<tool>
```

Examples:

```text
filesystem.read_file
github.create_issue
database.query
```
