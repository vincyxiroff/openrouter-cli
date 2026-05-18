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
- Session memory in `.openrouter-cli/history.json`
- Safety protections for commands, files, secrets, and credentials
- Git-aware commit message generation

## Install

```bash
npm install -g openrouter-cli
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
orc plugins
orc plugin install ./my-plugin
orc mcp add filesystem npx @modelcontextprotocol/server-filesystem ./
orc mcp connect filesystem
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

- Plugin ecosystem
- MCP support
- Local models
- Voice mode
- Multi-agent workflows
- VSCode extension
- Web dashboard
- Team collaboration

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
