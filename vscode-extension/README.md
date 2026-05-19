# openrouter-cli-vscode

Official VS Code extension MVP for `openrouter-cli`.

The extension uses `orc` as its backend instead of duplicating agent logic.

## Features

- Sidebar chat webview
- Streamed output from `orc`
- Explain selected code
- Fix selected code
- Refactor selected code
- Add documentation to selected code
- Trust status command
- Open an interactive `orc` terminal in the workspace
- Terminal/output integration

## Requirements

Install the CLI first:

```bash
npm install -g openrouter-cli-v2
orc setup
```

Trust is managed by the CLI. If a workspace is restricted, use `OpenRouter CLI: Trust Status` or open an `orc` terminal and run `/trust`.

## Commands

- OpenRouter CLI: Chat
- OpenRouter CLI: Explain
- OpenRouter CLI: Edit
- OpenRouter CLI: Fix Errors
- OpenRouter CLI: Refactor
- OpenRouter CLI: Add Documentation
- OpenRouter CLI: Trust Status
- OpenRouter CLI: Open Terminal
