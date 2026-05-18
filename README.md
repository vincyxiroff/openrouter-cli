# openrouter-cli

The AI coding CLI powered by OpenRouter.

`openrouter-cli` is a professional terminal coding agent for real codebases. It can chat about your project, build smart context, request structured AI edit plans, show diffs before writing files, and run commands only after confirmation.

## Features

- Interactive terminal chat with `orc`
- Single-shot project questions with `orc ask`
- AI coding mode with approved diffs via `orc edit`
- OpenRouter model support with streaming responses
- Live OpenRouter model discovery with cache and offline fallback
- Smart context selection from local repositories
- Session memory in `.openrouter-cli/history.json`
- Safe file editing with sensitive path protection
- Command execution confirmation and dangerous command blocking
- Git-aware commit message generation
- Premium terminal output with colors, spinners, markdown, and syntax highlighting

## Install

```bash
npm install -g openrouter-cli
```

## Quickstart

```bash
export OPENROUTER_API_KEY="your-key"
orc init
orc ask "explain this project"
orc edit "add input validation"
```

## Commands

```bash
orc
orc ask "explain this project"
orc edit "add jwt authentication"
orc explain
orc context
orc models
orc models --free
orc models --search claude
orc models --provider anthropic
orc models --context 100000
orc models --json
orc doctor
orc init
orc setup
orc setup --reset
orc setup --model
orc setup --key
orc commit
orc update
```

## Configuration

Run `orc` or `orc setup` to start the guided first-run setup. The setup stores your OpenRouter API key in `.env`, keeps it out of `.openrouter-cli.json`, verifies the key, downloads the live model catalog, and helps choose a default model.

Create `.openrouter-cli.json` manually only if you prefer:

```json
{
  "model": "anthropic/claude-sonnet-4",
  "temperature": 0.2,
  "maxContextFiles": 40,
  "maxFileSizeKB": 100,
  "allowCommandExecution": false,
  "ignoredPaths": [
    "node_modules",
    ".git",
    "dist",
    "build",
    ".next",
    "coverage",
    ".turbo",
    ".cache",
    ".env",
    "*.lock"
  ]
}
```

## Editing Workflow

`orc edit` follows a strict approval flow:

1. Analyze the task
2. Select relevant context files
3. Ask OpenRouter for a structured JSON edit plan
4. Show the summary and diff
5. Ask before applying changes
6. Ask before running any suggested command
7. Save the session memory

## Screenshots

Terminal screenshots are tracked in the roadmap for the first public release.

## FAQ

**Does it modify files automatically?**
No. File changes are applied only after you approve the diff.

**Can it run shell commands?**
Only after confirmation, and high-risk commands are blocked.

**Can it use any OpenRouter model?**
Yes. Set the model in `.openrouter-cli.json`.

**Where is memory stored?**
`.openrouter-cli/history.json`.

## Model Discovery

`orc models` retrieves the live OpenRouter model catalog from `https://openrouter.ai/api/v1/models`, stores a six-hour cache in `.openrouter-cli/models-cache.json`, and falls back to cached data when offline.

It supports search, provider filters, free model detection, minimum context length filters, multimodal filters, reasoning filters, JSON output, and pagination.

## Roadmap

- Plugins
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
