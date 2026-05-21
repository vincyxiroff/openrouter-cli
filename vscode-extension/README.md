# openrouter-cli-vscode

Official VS Code extension for `openrouter-cli`.

The extension uses `orc` as its backend instead of duplicating agent logic.

## Features

- Polished sidebar control center
- Streamed workspace chat through `orc ask`
- Trust controls for project, folder, status, and removal
- Edit flow through `orc edit` with terminal diff approval
- Optional auto-edit and auto-command toggles for trusted workspaces
- Explain selected code from the editor context menu
- Fix, refactor, and document selected code from the editor context menu
- Setup, doctor, and interactive terminal actions

## Requirements

Install the CLI first:

```bash
npm install -g openrouter-cli-v2
orc setup
```

Trust is managed by the CLI. If a workspace is restricted, use `OpenRouter CLI: Trust Status` or open an `orc` terminal and run `/trust`.

Edits are opened in an integrated terminal so the CLI can show diffs and ask for approval before writing files.

## Commands

- OpenRouter CLI: Chat
- OpenRouter CLI: Explain
- OpenRouter CLI: Edit
- OpenRouter CLI: Fix Errors
- OpenRouter CLI: Refactor
- OpenRouter CLI: Add Documentation
- OpenRouter CLI: Trust Status
- OpenRouter CLI: Trust Project
- OpenRouter CLI: Trust Folder
- OpenRouter CLI: Remove Trust
- OpenRouter CLI: Open Terminal
