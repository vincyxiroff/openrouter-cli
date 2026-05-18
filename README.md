# openrouter-cli

The AI coding CLI powered by OpenRouter.

`openrouter-cli` is a professional terminal coding agent for real codebases. It can chat about a project, build smart local context, stream OpenRouter responses, propose structured file edits, show diffs before writing, and run commands only after confirmation.

## Highlights

- Interactive terminal chat with `orc`
- First-run setup UI with API key verification and live model selection
- Single-shot questions with `orc ask`
- Approved AI editing workflow with professional diffs
- Live OpenRouter model discovery with cache and offline fallback
- Plugin architecture with local plugin loading and lifecycle hooks
- MCP server configuration, connection checks, and dynamic tool discovery
- Local provider architecture for Ollama, LM Studio, llama.cpp, and OpenAI-compatible APIs
- VSCode extension MVP powered by the `orc` backend
- Session memory in `.openrouter-cli/history.json`
- Safety protections for commands, files, secrets, and credentials
- Git-aware commit message generation

## Install

```bash
npm install -g openrouter-cli-v2
```

## Quickstart

```bash
orc
orc ask "explain this project"
orc edit "fix TypeScript errors"
orc models --free
```

On first run, `orc` starts a guided setup that stores `OPENROUTER_API_KEY` in `.env`, verifies the key, downloads live models, and creates `.openrouter-cli.json`.

## Commands

```bash
orc
orc setup
orc ask "explain this project"
orc edit "add jwt authentication"
orc explain
orc context
orc models --search claude
orc providers
orc provider setup
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
- [x] VSCode extension MVP
- [x] Web dashboard shell MVP
- [x] Team collaboration architecture planning
- [ ] Full plugin marketplace hosting
- [ ] Full voice streaming implementation
- [ ] Production web dashboard app
- [ ] Team collaboration SaaS

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
