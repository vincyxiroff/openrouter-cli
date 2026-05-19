# openrouter-cli

The AI coding CLI powered by OpenRouter.

`openrouter-cli` is a professional terminal coding agent for real codebases. It can chat about a project, build smart local context, stream OpenRouter responses, continue after tool calls, propose structured file edits, show diffs before writing, and protect untrusted workspaces with a project trust system.

## Highlights

- Interactive terminal chat with `orc`
- Slash command autocomplete in interactive chat
- File and folder mentions with `@path` autocomplete
- Trust Project, Trust Folder, and Restricted workspace security
- First-run setup UI with API key verification and live model selection
- Single-shot questions with `orc ask`
- Approved AI editing workflow with professional diffs and optional auto mode
- Live OpenRouter model discovery with global cache and offline fallback
- Plugin architecture with local plugin loading, lifecycle hooks, and slash commands
- MCP server configuration, connection checks, and dynamic tool discovery
- Local provider architecture for Ollama, LM Studio, llama.cpp, and OpenAI-compatible APIs
- VS Code extension MVP powered by the `orc` backend
- OS app-data storage for global state and project-local `.openrouter-cli/` state
- Safety protections for commands, files, secrets, credentials, plugins, and MCP
- Git-aware commit message generation

## Install

```bash
npm install -g openrouter-cli-v2
```

## Quickstart

```bash
orc
orc ask "explain this project"
orc ask "explain @src/index.ts"
orc edit "fix TypeScript errors"
orc models --free
```

On first run, `orc` starts a guided setup that stores `OPENROUTER_API_KEY` in `.env`, verifies the key, downloads live models, creates `.openrouter-cli/project-config.json`, and asks whether to trust the current project.

In interactive mode, type `/` for slash commands or `@` to mention files and folders.

## Commands

```bash
orc
orc setup
orc ask "explain this project"
orc edit "add jwt authentication"
orc edit "fix tests" --yes
orc explain
orc context
orc models --search claude
orc providers
orc provider setup
orc trust
orc trust list
orc plugins
orc plugin install ./my-plugin
orc mcp add filesystem npx @modelcontextprotocol/server-filesystem ./
orc mcp connect filesystem
orc voice
orc agents
orc workflow "build auth system"
orc dashboard
orc doctor
orc commit
```

## Interactive Features

- `/help`, `/models`, `/context`, `/files`, `/trust`, `/doctor`, `/plugins`, `/mcp`, `/exit`
- `@src/index.ts` injects a file into AI context
- `@src/commands` injects matching text files from a folder
- `orc edit "fix bugs" --yes` enables auto edits and commands for trusted projects only
- `orc edit "fix bugs" --auto-edits`
- `orc edit "run tests" --auto-cmds`

## Storage

Global state is stored in the OS app-data directory:

- Windows: `%APPDATA%\openrouter-cli`
- Linux: `$XDG_CONFIG_HOME/openrouter-cli` or `~/.config/openrouter-cli`
- macOS: `~/Library/Application Support/openrouter-cli`

Project state stays under `.openrouter-cli/`.

## Documentation

Start with the documentation hub:

- [Documentation Index](docs/README.md)
- [Getting Started](docs/getting-started/README.md)
- [Configuration](docs/configuration/README.md)
- [Architecture](docs/architecture/README.md)
- [Plugin Development](docs/plugins/README.md)
- [MCP Support](docs/mcp/README.md)
- [Development Guide](docs/development/README.md)

## Roadmap

- [x] First-run setup UI
- [x] Live OpenRouter model discovery
- [x] Approved AI file editing workflow
- [x] Plugin system MVP
- [x] MCP support MVP
- [x] Local providers architecture MVP
- [x] Plugin marketplace registry MVP
- [x] Voice mode architecture MVP
- [x] Multi-agent workflows architecture MVP
- [x] VS Code extension MVP
- [x] Web dashboard shell MVP
- [x] Team collaboration architecture planning
- [x] Agent tool loop continuation after tool calls
- [x] Auto accept edits and commands
- [x] Slash command autocomplete
- [x] File mention autocomplete
- [x] Trust project/folder security
- [x] OS app-data storage
- [ ] Full plugin marketplace hosting
- [ ] Full voice streaming implementation
- [ ] Production web dashboard app
- [ ] Team collaboration SaaS

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
