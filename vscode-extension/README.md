# openrouter-cli-vscode

Official VSCode extension MVP for `openrouter-cli`.

The extension uses `orc` as its backend instead of duplicating agent logic.

## Features

- Sidebar chat webview
- Streamed output from `orc`
- Explain selected code
- Fix selected code
- Refactor selected code
- Add documentation to selected code
- Terminal/output integration

## Requirements

Install the CLI first:

```bash
npm install -g openrouter-cli
orc setup
```

## Commands

- OpenRouter CLI: Chat
- OpenRouter CLI: Explain
- OpenRouter CLI: Edit
- OpenRouter CLI: Fix Errors
- OpenRouter CLI: Refactor
- OpenRouter CLI: Add Documentation
