# File and Module Map

## CLI Entry

- `src/index.ts`: executable entrypoint.
- `src/cli/program.ts`: Commander program and command registration.

## AI

- `src/ai/openrouter.ts`: OpenRouter chat completions, streaming SSE, retries, and model listing.
- `src/ai/modelRegistry.ts`: live model discovery, cache, filters, recommendations, and free model detection.
- `src/ai/prompts.ts`: system, context, and edit prompts.

## Commands

- `src/commands/setup.ts`: first-run setup UI.
- `src/commands/ask.ts`: single-shot AI requests.
- `src/commands/edit.ts`: approved file editing workflow.
- `src/commands/models.ts`: model discovery CLI.
- `src/commands/plugins.ts`: plugin command handlers.
- `src/commands/mcp.ts`: MCP command handlers.
- `src/commands/doctor.ts`: diagnostics.
- `src/commands/commit.ts`: AI commit message generation.

## Core

- `src/core/serviceContainer.ts`: dependency registry for extension code.
- `src/core/toolRegistry.ts`: AI tool registry.
- `src/core/providerRegistry.ts`: provider registry.
- `src/core/eventBus.ts`: lightweight event bus.
- `src/core/types.ts`: shared app types.

## Plugins

- `src/plugins/types/plugin.ts`: plugin interface.
- `src/plugins/loader/pluginLoader.ts`: local plugin loading and isolation.
- `src/plugins/loader/pluginManifest.ts`: manifest validation.
- `src/plugins/registry/pluginConfig.ts`: `.openrouter-cli/plugins.json`.
- `src/plugins/hooks/pluginHooks.ts`: lifecycle hook runner.
- `src/plugins/core/pluginManager.ts`: runtime assembly.

## MCP

- `src/mcp/types/mcp.ts`: MCP config, requests, responses, tools, and transport types.
- `src/mcp/registry/mcpConfig.ts`: `.openrouter-cli/mcp.json`.
- `src/mcp/client/mcpClient.ts`: JSON-RPC MCP client.
- `src/mcp/transport/stdioTransport.ts`: stdio transport.
- `src/mcp/transport/httpTransport.ts`: HTTP transport.
- `src/mcp/tools/mcpToolRegistry.ts`: discovered MCP tool registry.
- `src/mcp/adapters/mcpToolAdapter.ts`: approval wrapper.
