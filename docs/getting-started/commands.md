# Commands

## Chat

```bash
orc
```

Starts the interactive terminal UI. On first run it starts setup automatically.

Interactive helpers:

- Type `/` to open slash command autocomplete.
- Type `@` to mention files or folders.
- The prompt shows the current trust badge.

## Ask

```bash
orc ask "explain this project"
orc ask "explain @src/index.ts"
```

Runs a single-shot request with selected repository context. Mentioned files are loaded as priority context.

## Edit

```bash
orc edit "add input validation"
orc edit "fix type errors" --yes
orc edit "update docs" --auto-edits
orc edit "run tests" --auto-cmds
```

Asks the model for a structured edit plan, renders a diff, asks for confirmation, applies approved changes, and optionally runs suggested commands. Auto mode only works in trusted projects and folders.

## Models

```bash
orc models
orc models --free
orc models --search claude
orc models --provider anthropic
orc models --context 100000
orc models --json
```

Discovers models live from OpenRouter and uses the global app-data `models-cache.json` as a six-hour cache.

## Trust

```bash
orc trust
orc trust list
orc trust remove
orc trust reset
```

Inside interactive chat:

```text
/trust
/trust project
/trust folder
/trust remove
/trust status
```

## Plugins

```bash
orc plugins
orc plugin list
orc plugin install ./my-plugin
orc plugin enable my-plugin
orc plugin disable my-plugin
orc plugin remove my-plugin
```

Plugins are disabled in restricted workspaces.

## MCP

```bash
orc mcp list
orc mcp add filesystem npx @modelcontextprotocol/server-filesystem ./
orc mcp connect filesystem
orc mcp status
orc mcp remove filesystem
```

MCP execution is disabled in restricted workspaces.
