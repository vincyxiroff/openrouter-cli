# Commands

## Chat

```bash
orc
```

Starts the interactive terminal UI. On first run it starts setup automatically.

## Ask

```bash
orc ask "explain this project"
```

Runs a single-shot request with selected repository context.

## Edit

```bash
orc edit "add input validation"
```

Asks the model for a structured edit plan, renders a diff, asks for confirmation, applies approved changes, and optionally runs suggested commands after confirmation.

## Models

```bash
orc models
orc models --free
orc models --search claude
orc models --provider anthropic
orc models --context 100000
orc models --json
```

Discovers models live from OpenRouter and uses `.openrouter-cli/models-cache.json` as a six-hour cache.

## Plugins

```bash
orc plugins
orc plugin list
orc plugin install ./my-plugin
orc plugin enable my-plugin
orc plugin disable my-plugin
orc plugin remove my-plugin
```

## MCP

```bash
orc mcp list
orc mcp add filesystem npx @modelcontextprotocol/server-filesystem ./
orc mcp connect filesystem
orc mcp status
orc mcp remove filesystem
```
