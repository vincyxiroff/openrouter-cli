# Creating MCP Server Configs

MCP servers are configured in:

```text
.openrouter-cli/mcp.json
```

## Stdio Server

```json
{
  "servers": [
    {
      "name": "filesystem",
      "command": "npx",
      "args": ["@modelcontextprotocol/server-filesystem", "./"],
      "enabled": true,
      "timeoutMs": 10000,
      "permissions": ["read", "write"]
    }
  ]
}
```

Equivalent command:

```bash
orc mcp add filesystem npx @modelcontextprotocol/server-filesystem ./
```

## HTTP Server

```json
{
  "servers": [
    {
      "name": "docs",
      "url": "http://localhost:3000/mcp",
      "enabled": true,
      "timeoutMs": 10000,
      "permissions": ["network"]
    }
  ]
}
```

Equivalent command:

```bash
orc mcp add docs http://localhost:3000/mcp
```

## Fields

`name`
: Local server name used as the tool namespace.

`command`
: Executable for stdio servers.

`args`
: Arguments passed to the stdio command.

`url`
: HTTP endpoint for HTTP servers.

`enabled`
: Whether `orc mcp connect` should use this server.

`timeoutMs`
: Request timeout.

`permissions`
: Declared permission scopes used by approval policies.
