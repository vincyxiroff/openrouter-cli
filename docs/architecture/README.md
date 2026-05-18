# Architecture

`openrouter-cli` is organized as a modular CLI platform.

## Main Areas

- `src/ai` handles OpenRouter requests, streaming, prompting, and model discovery.
- `src/commands` contains user-facing command workflows.
- `src/config` loads config, `.env`, and setup helpers.
- `src/context` builds smart repository context.
- `src/core` contains shared registries and extension primitives.
- `src/filesystem` validates, diffs, and applies approved edit plans.
- `src/git` provides git status and diff awareness.
- `src/mcp` provides MCP client, transports, config, and tool discovery.
- `src/memory` persists conversation history.
- `src/plugins` provides plugin loading, manifests, hooks, and plugin config.
- `src/safety` blocks sensitive paths and dangerous commands.
- `src/terminal` owns terminal UX.

## Design Principles

- The AI proposes changes; the CLI applies approved changes.
- Tools and providers are registered dynamically.
- Plugins and MCP servers should fail in isolation.
- Secrets live in `.env`, not in model prompts or project config.
- Runtime state is kept under `.openrouter-cli/`.

## Extension Layer

The extension layer is built around:

- `ServiceContainer`
- `ToolRegistry`
- `ProviderRegistry`
- `EventBus`
- plugin lifecycle hooks
- MCP dynamic tool discovery
