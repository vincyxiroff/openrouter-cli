# Architecture

`openrouter-cli` is organized as a modular CLI platform.

## Main Areas

- `src/ai` handles OpenRouter requests, streaming, prompting, tool-loop continuation, and model discovery.
- `src/commands` contains user-facing command workflows.
- `src/config` loads project config, `.env`, and setup helpers.
- `src/context` builds smart repository context.
- `src/core` contains shared registries and extension primitives.
- `src/filesystem` validates, diffs, and applies approved edit plans.
- `src/git` provides git status and diff awareness.
- `src/mcp` provides MCP client, transports, config, and tool discovery.
- `src/memory` persists conversation history.
- `src/mentions` handles `@file` parsing, scanning, matching, rendering, and context resolution.
- `src/plugins` provides plugin loading, manifests, hooks, slash command support, and plugin config.
- `src/safety` blocks sensitive paths and dangerous commands.
- `src/storage` owns OS app-data and project-data paths.
- `src/terminal` owns terminal UX.
- `src/trust` resolves project trust, stores trust state, renders trust UI, and guards risky actions.

## Design Principles

- The AI proposes changes; the CLI applies approved changes.
- Tool results are injected back into context until the model returns a final answer.
- Tools and providers are registered dynamically.
- Plugins and MCP servers should fail in isolation.
- Secrets live in `.env`, not in model prompts or project config.
- Global state lives in OS app data.
- Project-local state lives under `.openrouter-cli/`.
- Untrusted workspaces run in restricted mode.

## Extension Layer

The extension layer is built around:

- `ServiceContainer`
- `ToolRegistry`
- `ProviderRegistry`
- `EventBus`
- plugin lifecycle hooks
- plugin slash commands
- MCP dynamic tool discovery
