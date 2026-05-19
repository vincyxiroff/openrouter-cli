# File and Module Map

## CLI Entry

- `src/index.ts`: executable entrypoint.
- `src/cli/program.ts`: Commander program and command registration.

## AI

- `src/ai/openrouter.ts`: OpenRouter chat completions, streaming SSE, retries, and model listing.
- `src/ai/modelRegistry.ts`: live model discovery, global cache, filters, recommendations, and free model detection.
- `src/ai/prompts.ts`: system, context, and edit prompts.
- `src/agents/toolLoop.ts`: recursive tool execution loop for model tool calls.

## Commands

- `src/commands/setup.ts`: first-run setup UI.
- `src/commands/ask.ts`: single-shot AI requests.
- `src/commands/edit.ts`: approved file editing workflow.
- `src/commands/models.ts`: model discovery CLI.
- `src/commands/plugins.ts`: plugin command handlers.
- `src/commands/mcp.ts`: MCP command handlers.
- `src/commands/doctor.ts`: diagnostics.
- `src/commands/commit.ts`: AI commit message generation.
- `src/commands/trust.ts`: trust manager command handlers.
- `src/commands/slash`: slash command registry, matcher, renderer, and interactive input.

## Core

- `src/core/serviceContainer.ts`: dependency registry for extension code.
- `src/core/toolRegistry.ts`: AI tool registry.
- `src/core/providerRegistry.ts`: provider registry.
- `src/core/eventBus.ts`: lightweight event bus.
- `src/core/autoApproval.ts`: auto-approval option resolution.
- `src/core/types.ts`: shared app types.

## Mentions

- `src/mentions/parser/fileMentionParser.ts`: extracts `@file` mentions from prompts.
- `src/mentions/scanner/fileMentionScanner.ts`: scans safe text files and git status.
- `src/mentions/scanner/fileMentionCache.ts`: project-local file suggestion cache.
- `src/mentions/matcher/fileMentionMatcher.ts`: fuzzy matching and ranking.
- `src/mentions/renderer/fileMentionRenderer.ts`: terminal suggestion popup.
- `src/mentions/context/mentionContextResolver.ts`: reads mentioned files into AI context.

## Plugins

- `src/plugins/types/plugin.ts`: plugin interface.
- `src/plugins/loader/pluginLoader.ts`: local plugin loading and isolation.
- `src/plugins/loader/pluginManifest.ts`: manifest validation.
- `src/plugins/registry/pluginConfig.ts`: `.openrouter-cli/plugins.json`.
- `src/plugins/registry/marketplace.ts`: marketplace registry fetch with global cache fallback.
- `src/plugins/hooks/pluginHooks.ts`: lifecycle hook runner.
- `src/plugins/core/pluginManager.ts`: runtime assembly with trust restrictions.

## MCP

- `src/mcp/types/mcp.ts`: MCP config, requests, responses, tools, and transport types.
- `src/mcp/registry/mcpConfig.ts`: `.openrouter-cli/mcp.json`.
- `src/mcp/client/mcpClient.ts`: JSON-RPC MCP client.
- `src/mcp/transport/stdioTransport.ts`: stdio transport.
- `src/mcp/transport/httpTransport.ts`: HTTP transport.
- `src/mcp/tools/mcpToolRegistry.ts`: discovered MCP tool registry.
- `src/mcp/adapters/mcpToolAdapter.ts`: approval wrapper.

## Storage and Trust

- `src/storage/paths/appDataPaths.ts`: OS app-data directory and global paths.
- `src/storage/paths/projectDataPaths.ts`: project-local `.openrouter-cli/` paths.
- `src/storage/app-data/globalConfig.ts`: global config scaffold.
- `src/storage/app-data/authMetadata.ts`: auth storage metadata for future keychain support.
- `src/trust/manager/trustManager.ts`: trust mutations and state.
- `src/trust/resolver/trustResolver.ts`: project root and trust level detection.
- `src/trust/storage/trustStorage.ts`: global `trusted.json` persistence.
- `src/trust/guards/trustGuard.ts`: guards edits, commands, plugins, and MCP.
- `src/trust/ui/trustUi.ts`: trust prompt and badges.

## Providers

- `src/providers/types.ts`: provider interface.
- `src/providers/registry/providerRegistry.ts`: provider registry and factory.
- `src/providers/openrouter/provider.ts`: OpenRouter adapter.
- `src/providers/ollama/provider.ts`: Ollama adapter.
- `src/providers/lmstudio/provider.ts`: LM Studio adapter.
- `src/providers/llamacpp/provider.ts`: llama.cpp adapter.
- `src/providers/local/provider.ts`: generic local OpenAI-compatible adapter.

## Roadmap Modules

- `src/voice`: voice mode configuration and session shell.
- `src/agents`: multi-agent workflow configuration.
- `src/dashboard`: local dashboard shell.
- `src/team`: team collaboration planning config.
- `vscode-extension`: VS Code extension MVP.
